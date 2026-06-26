const db = require('../config/db');

// Get all support tickets
exports.getTickets = async (req, res) => {
  const { clientId, status } = req.query;

  let filterClientId = clientId;
  if (req.user.role === 'client') {
    filterClientId = req.user.clientId;
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      let filtered = [...data.support_tickets];

      if (filterClientId) {
        filtered = filtered.filter(t => t.client_id === parseInt(filterClientId));
      }
      if (status) {
        filtered = filtered.filter(t => t.status === status);
      }

      // Attach client company name
      const result = filtered.map(t => {
        const client = data.corporate_clients.find(c => c.id === t.client_id) || {};
        return {
          ...t,
          company_name: client.company_name
        };
      });

      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json(result);
    } else {
      // MySQL Mode
      let queryStr = `
        SELECT t.*, c.company_name
        FROM support_tickets t
        JOIN corporate_clients c ON t.client_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (filterClientId) {
        queryStr += ' AND t.client_id = ?';
        params.push(filterClientId);
      }
      if (status) {
        queryStr += ' AND t.status = ?';
        params.push(status);
      }

      queryStr += ' ORDER BY t.created_at DESC';

      const [tickets] = await db.getPool().execute(queryStr, params);
      return res.json(tickets);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single ticket and its message thread replies
exports.getTicketById = async (req, res) => {
  const { id } = req.params;

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      const ticket = data.support_tickets.find(t => t.id === parseInt(id));

      if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }

      if (req.user.role === 'client' && ticket.client_id !== req.user.clientId) {
        return res.status(403).json({ message: 'Unauthorized access to ticket details' });
      }

      const client = data.corporate_clients.find(c => c.id === ticket.client_id) || {};
      
      // Pull replies
      const replies = data.ticket_replies
        .filter(r => r.ticket_id === ticket.id)
        .map(r => {
          const sender = data.users.find(u => u.id === r.user_id) || {};
          return {
            ...r,
            sender_name: sender.username,
            sender_role: sender.role
          };
        });

      replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      return res.json({ ticket, client, replies });
    } else {
      // MySQL Mode
      const [tickets] = await db.getPool().execute(
        `SELECT t.*, c.company_name, c.contact_person, c.phone 
         FROM support_tickets t 
         JOIN corporate_clients c ON t.client_id = c.id 
         WHERE t.id = ?`,
        [id]
      );

      if (tickets.length === 0) {
        return res.status(404).json({ message: 'Support ticket not found' });
      }

      const ticket = tickets[0];
      if (req.user.role === 'client' && ticket.client_id !== req.user.clientId) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      // Pull replies
      const [replies] = await db.getPool().execute(
        `SELECT r.*, u.username as sender_name, u.role as sender_role 
         FROM ticket_replies r 
         JOIN users u ON r.user_id = u.id 
         WHERE r.ticket_id = ? 
         ORDER BY r.created_at ASC`,
        [id]
      );

      return res.json({ ticket, replies });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a support ticket
exports.createTicket = async (req, res) => {
  const { subject, description, priority } = req.body;

  if (req.user.role !== 'client') {
    return res.status(403).json({ message: 'Only corporate clients can open support tickets' });
  }

  if (!subject || !description) {
    return res.status(400).json({ message: 'Please enter subject and description' });
  }

  try {
    const clientId = req.user.clientId;

    if (db.isMock()) {
      const data = db.mock.load();
      
      const newTicket = {
        id: data.support_tickets.length + 1,
        client_id: clientId,
        subject,
        description,
        priority: priority || 'medium',
        status: 'open',
        created_at: new Date(),
        updated_at: new Date()
      };

      data.support_tickets.push(newTicket);

      // Create initial message in replies thread
      data.ticket_replies.push({
        id: data.ticket_replies.length + 1,
        ticket_id: newTicket.id,
        user_id: req.user.id,
        message: description,
        created_at: new Date()
      });

      db.mock.save(data);

      return res.status(201).json({ message: 'Support ticket created successfully', ticket: newTicket });
    } else {
      // MySQL Mode
      const connection = await db.getPool().getConnection();
      try {
        await connection.beginTransaction();

        const [ticketResult] = await connection.execute(
          'INSERT INTO support_tickets (client_id, subject, description, priority, status) VALUES (?, ?, ?, ?, "open")',
          [clientId, subject, description, priority || 'medium']
        );
        const ticketId = ticketResult.insertId;

        // Insert first reply
        await connection.execute(
          'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
          [ticketId, req.user.id, description]
        );

        await connection.commit();
        connection.release();

        return res.status(201).json({ message: 'Support ticket created successfully', ticketId });
      } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add a reply message to ticket
exports.replyTicket = async (req, res) => {
  const { id } = req.params;
  const { message, status } = req.body; // option to change status (e.g. close ticket)

  if (!message) {
    return res.status(400).json({ message: 'Please enter a reply message' });
  }

  try {
    if (db.isMock()) {
      const data = db.mock.load();
      const ticketIdx = data.support_tickets.findIndex(t => t.id === parseInt(id));

      if (ticketIdx === -1) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      const ticket = data.support_tickets[ticketIdx];
      if (req.user.role === 'client' && ticket.client_id !== req.user.clientId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // Add reply
      const newReply = {
        id: data.ticket_replies.length + 1,
        ticket_id: ticket.id,
        user_id: req.user.id,
        message,
        created_at: new Date()
      };
      data.ticket_replies.push(newReply);

      // Update status if provided, or set to open/in_progress based on who replied
      if (status) {
        ticket.status = status;
      } else if (req.user.role === 'admin' || req.user.role === 'accounts') {
        ticket.status = 'in_progress';
      }
      ticket.updated_at = new Date();

      // Notify the client if Admin replied
      if (req.user.role === 'admin' || req.user.role === 'accounts') {
        const client = data.corporate_clients.find(c => c.id === ticket.client_id);
        if (client) {
          data.notifications.push({
            id: data.notifications.length + 1,
            user_id: client.user_id,
            type: 'ticket',
            message: `New reply received on your support query: "${ticket.subject}". Status: ${ticket.status}`,
            is_read: false,
            created_at: new Date()
          });
        }
      }

      db.mock.save(data);

      return res.status(201).json({ message: 'Reply added successfully', reply: newReply, ticketStatus: ticket.status });
    } else {
      // MySQL Mode
      const [tickets] = await db.getPool().execute('SELECT * FROM support_tickets WHERE id = ?', [id]);
      if (tickets.length === 0) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      const ticket = tickets[0];
      if (req.user.role === 'client' && ticket.client_id !== req.user.clientId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const connection = await db.getPool().getConnection();
      try {
        await connection.beginTransaction();

        // 1. Insert reply
        await connection.execute(
          'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
          [id, req.user.id, message]
        );

        // 2. Update status
        let targetStatus = ticket.status;
        if (status) {
          targetStatus = status;
        } else if (req.user.role === 'admin' || req.user.role === 'accounts') {
          targetStatus = 'in_progress';
        }

        await connection.execute(
          'UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [targetStatus, id]
        );

        // 3. Create Notification if Admin replied
        if (req.user.role === 'admin' || req.user.role === 'accounts') {
          const [clients] = await connection.execute(
            'SELECT user_id FROM corporate_clients WHERE id = ?',
            [ticket.client_id]
          );
          if (clients.length > 0) {
            await connection.execute(
              'INSERT INTO notifications (user_id, type, message) VALUES (?, "ticket", ?)',
              [clients[0].user_id, `New reply received on your support query: "${ticket.subject}". Status: ${targetStatus}`]
            );
          }
        }

        await connection.commit();
        connection.release();

        return res.status(201).json({ message: 'Reply added successfully', ticketStatus: targetStatus });
      } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

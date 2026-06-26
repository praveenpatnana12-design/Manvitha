const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Computes statistical metrics from bookings, invoices, and payments.
 */
const computeStats = (bookings, invoices, payments, clientName) => {
  // 1. Frequent Routes
  const routeCounts = {};
  bookings.forEach(b => {
    const route = `${b.source} to ${b.destination}`;
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });
  const frequentRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([route, count]) => `${route} (${count} trips)`);

  // 2. Spending Analysis
  const totalSpend = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount), 0);
  const avgTripCost = bookings.length > 0 ? (totalSpend / bookings.length) : 0;
  
  // 3. Delayed Payments
  const delayedAlerts = [];
  invoices.forEach(inv => {
    if (inv.status === 'pending') {
      const dueDate = new Date(inv.due_date);
      const today = new Date();
      if (today > dueDate) {
        const diffTime = Math.abs(today - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        delayedAlerts.push(`Invoice ${inv.invoice_number} is overdue by ${diffDays} days (Amount: INR ${parseFloat(inv.total_amount).toLocaleString('en-IN')}).`);
      }
    }
  });

  // 4. Cost Optimization Suggestions
  const costSuggestions = [];
  // Rule: Check if they are using SUV/Bus for small distance trips
  let lowDistanceHeavyVehicleCount = 0;
  bookings.forEach(b => {
    // If distance is less than 30km but vehicle model is Innova or Coach
    if (parseFloat(b.distance_km) < 30 && (b.rate_per_km >= 22)) {
      lowDistanceHeavyVehicleCount++;
    }
  });

  if (lowDistanceHeavyVehicleCount > 1) {
    costSuggestions.push(`Potential Savings: We noticed ${lowDistanceHeavyVehicleCount} short-distance trips using premium SUV/Bus category vehicles. Opting for sedan category vehicles for routes under 30km could reduce billing by up to 15%.`);
  }
  
  // Rule: General frequency discount suggestion
  if (bookings.length > 5) {
    costSuggestions.push('Volume Discount opportunity: Your monthly trip frequency exceeds 5 trips. Contact our support team to negotiate a fixed-rate monthly retainer plan.');
  } else {
    costSuggestions.push('Consolidated Bookings: Consolidate multiple employee airport pick-ups/drop-offs on the same day into a single SUV ride instead of multiple Sedans to save toll charges.');
  }

  // 5. Default billing summary
  const totalGST = bookings.reduce((sum, b) => sum + parseFloat(b.gst_amount), 0);
  const billingSummary = `In this billing cycle, ${clientName || 'the client'} logged ${bookings.length} trips with a cumulative spend of INR ${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Total tax processed is INR ${totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (5% GST). Average cost per trip stands at INR ${avgTripCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`;

  return {
    billingSummary,
    spendingAnalysis: `Average trip expenditure is INR ${avgTripCost.toFixed(2)}. Total invoice volume processed stands at ${invoices.length} invoices.`,
    frequentRoutes: frequentRoutes.length > 0 ? frequentRoutes : ['No trips recorded in this period'],
    delayedPaymentAlerts: delayedAlerts.length > 0 ? delayedAlerts : ['No delayed payments found.'],
    costOptimization: costSuggestions
  };
};

/**
 * Generates AI insights.
 * Falls back to rule-based analysis if API key is not available.
 */
const generateInsights = async (bookings, invoices, payments, clientName) => {
  const stats = computeStats(bookings, invoices, payments, clientName);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return rule-based statistics directly
    return {
      ...stats,
      provider: 'rule-based-fallback'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an AI Billing Analyst for "Manivtha Tours & Travels", a corporate logistics company.
      Here is the billing data for our corporate client "${clientName || 'Corporate Client'}":
      
      Trip metrics:
      - Total Bookings count: ${bookings.length}
      - Detailed Bookings: ${JSON.stringify(bookings.map(b => ({ date: b.trip_date, source: b.source, dest: b.destination, total: b.total_amount, dist: b.distance_km })))}
      - Invoices status: ${JSON.stringify(invoices.map(i => ({ number: i.invoice_number, amount: i.total_amount, status: i.status, due: i.due_date })))}
      - Payments history: ${JSON.stringify(payments.map(p => ({ amount: p.amount, method: p.payment_method })))}
      
      Rule-based pre-calculations:
      - Executive Billing Summary: ${stats.billingSummary}
      - Spending Analysis: ${stats.spendingAnalysis}
      - Frequent Routes: ${stats.frequentRoutes.join(', ')}
      - Overdue Alerts: ${stats.delayedPaymentAlerts.join(', ')}
      - Fleet Optimization Tips: ${stats.costOptimization.join(', ')}

      Task:
      Based on the trip logs and invoice lists above, generate a highly professional corporate billing report. Keep it concise, professional, and formatted in clear sections. Provide:
      1. An executive summary (under 4 lines) summarizing usage and total costs.
      2. A brief analysis of travel spending behaviors (focusing on route frequency and fleet selections).
      3. Strategic cost optimization suggestions specific to their travel patterns.
      4. Overdue payment reminders if applicable.

      Respond ONLY with a JSON object in this format (do not include markdown block syntax like \`\`\`json):
      {
        "billingSummary": "...",
        "spendingAnalysis": "...",
        "frequentRoutes": ["Route A", "Route B"],
        "delayedPaymentAlerts": ["Alert 1", "Alert 2"],
        "costOptimization": ["Suggestion 1", "Suggestion 2"]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse response. Handle possible markdown wrapping.
    const cleanJSON = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJSON);
    
    return {
      ...parsed,
      provider: 'gemini-ai'
    };
  } catch (error) {
    console.error('Gemini API execution failed. Returning fallback rules.', error);
    return {
      ...stats,
      provider: 'rule-based-fallback-error'
    };
  }
};

module.exports = { generateInsights };

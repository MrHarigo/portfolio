const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Cache results for 1 hour to avoid excessive API calls
let cachedData = null;
let cacheTime = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Hardcoded GA4 property ID
const GA4_PROPERTY_ID = 'G-WX0M47C15W';

exports.handler = async (event, context) => {
  try {
    // Return cached data if available and not expired
    if (cachedData && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        },
        body: JSON.stringify(cachedData)
      };
    }

    // Parse GA4 credentials from environment variable
    const credentialsJson = JSON.parse(process.env.GA4_CREDENTIALS);

    // Calculate date range - end date is today
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    
    // Calculate start date as 1 month ago from today
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const startDate = oneMonthAgo.toISOString().split('T')[0];

    console.log(`Fetching GA4 data from ${startDate} to ${endDate}`);

    // Initialize the GA4 client with your credentials
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: credentialsJson
    });

    // Run the GA4 report query
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: startDate,
          endDate: endDate,
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    // Process the response
    let totalVisitors = 0;
    if (response?.rows?.[0]?.metricValues?.[0]?.value) {
      totalVisitors = Number.parseInt(response.rows[0].metricValues[0].value, 10);
    }

    // Structure the data for the frontend
    const result = {
      count: totalVisitors,
      portfolio: totalVisitors, // Use the same value for the portfolio project
      // Add more project-specific data if needed
    };

    // Cache the result
    cachedData = result;
    cacheTime = Date.now();

    // Return the result
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch visitor data' })
    };
  }
};

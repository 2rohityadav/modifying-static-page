// This requires a Node.js server to implement
// Example using Express.js

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = 3000;

console.log('version: v0.0.1');

app.get('/', async (req, res) => {
  try {
    // Fetch the playwright.dev website
    const response = await axios.get('https://playwright.dev/');

    // Load the HTML content into cheerio for manipulation
    const $ = cheerio.load(response.data);

    // Remove the navbar
    $('nav[aria-label="Main"]').remove();

    // Send the modified HTML back to the client
    res.send($.html());
  } catch (error) {
    console.error('Error fetching or modifying the page:', error);
    res.status(500).send('An error occurred while processing the request');
  }
});

// Handle other routes to proxy all playwright.dev content
app.get('*', async (req, res) => {
  try {
    const url = `https://playwright.dev${req.url}`;
    const response = await axios.get(url);

    // For non-HTML responses, just pass through
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('text/html')) {
      res.set('Content-Type', contentType);
      res.send(response.data);
      return;
    }

    // For HTML, modify and remove navbar
    const $ = cheerio.load(response.data);
    $('nav[aria-label="Main"]').remove();
    res.send($.html());
  } catch (error) {
    console.error(`Error proxying ${req.url}:`, error);
    res.status(500).send('An error occurred while processing the request');
  }
});

app.listen(port, () => {
  console.log(`Playwright proxy server running at http://localhost:${port}`);
});
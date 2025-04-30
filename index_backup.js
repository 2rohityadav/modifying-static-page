const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = process.env.PORT || 3000;

console.log('version: v1.0.1');

// Helper function to modify HTML content
function modifyHtml(html) {
  const $ = cheerio.load(html);

  // Remove the navbar
  $('nav[aria-label="Main"]').remove();

  // Add CSS to hide the navbar if it gets added back dynamically
  $('head').append(`
    <style>
      nav[aria-label="Main"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        left: -9999px !important;
      }
    </style>
  `);

  // Add a script to continuously remove the navbar
  $('body').append(`
    <script>
      (function() {
        function removeNavbar() {
          const navbar = document.querySelector('nav[aria-label="Main"]');
          if (navbar) {
            navbar.remove();
          }
        }
        
        // Run immediately
        removeNavbar();
        
        // Set up a MutationObserver to detect if the navbar gets added back
        const observer = new MutationObserver(function(mutations) {
          removeNavbar();
        });
        
        // Start observing the document body for DOM changes
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Also run periodically as a backup
        setInterval(removeNavbar, 500);
      })();
    </script>
  `);

  return $.html();
}

// Handle root path
app.get('/', async (req, res) => {
  try {
    // Fetch the playwright.dev website
    const response = await axios.get('https://playwright.dev/');

    // Modify HTML to remove navbar and inject protective CSS/JS
    const modifiedHtml = modifyHtml(response.data);

    // Send the modified HTML back to the client
    res.send(modifiedHtml);
  } catch (error) {
    console.error('Error fetching or modifying the page:', error);
    res.status(500).send('An error occurred while processing the request');
  }
});

// Use app.use for all other routes
app.use(async (req, res) => {
  try {
    // Get the path from the request URL
    const path = req.url;
    const url = `https://playwright.dev${path}`;

    console.log(`Proxying request to: ${url}`);

    const response = await axios.get(url);

    // For non-HTML responses, just pass through
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('text/html')) {
      // Copy all headers
      Object.keys(response.headers).forEach(key => {
        // Skip setting content-length as we might modify content
        if (key.toLowerCase() !== 'content-length') {
          res.set(key, response.headers[key]);
        }
      });
      res.send(response.data);
      return;
    }

    // For HTML, modify and remove navbar
    const modifiedHtml = modifyHtml(response.data);
    res.send(modifiedHtml);
  } catch (error) {
    console.error(`Error proxying ${req.url}:`, error);
    res.status(500).send('An error occurred while processing the request');
  }
});

app.listen(port, () => {
  console.log(`Playwright proxy server running at http://localhost:${port}`);
});
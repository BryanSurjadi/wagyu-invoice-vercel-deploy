const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const invoiceRoute = require('./routes/invoice');

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Form input
app.get('/', (req, res) => {
    res.render('invoice_form'); // you'll create this view
});

// Render invoice & generate PDF
app.use('/generate', invoiceRoute);

app.listen(port, () => {
    console.log(`Invoice app running at http://localhost:${port}`);
});

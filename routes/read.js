
const express = require('express');
const fs = require('fs');
const config = require('../config.json');


/* GET home page. */
router.get('/', function (req, res, next) {
    res.send("Oioioi")
});
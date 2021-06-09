const express = require('express');
const authenticate = require('../middleware/authenticate');
const Class = require('../models/class');

const router = express.Router();
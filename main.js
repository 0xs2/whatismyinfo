require('dotenv').config()

const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const path = require("path"); 
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const parseui = require("parse-user-agent");
const app = express()
const limiter = rateLimit({
	windowMs: 2 * 60 * 1000,
	max: 20,
    	message: 'Too many requests from this IP.',
	standardHeaders: true,
	legacyHeaders: false
});

app.set("view engine", "ejs")

app.use('/', limiter);
app.use(helmet());
app.use(compression());
app.use(express.static('public'));

app.get("/",limiter,(req,res) => {
	var ip = req.header("CF-Connecting-IP");
    axios.get(`https://ipgeolocation.abstractapi.com/v1/?api_key=${process.env.API_KEY}&ip_address=${ip}`)
    .then(function(response) {
        if(response.status == 429) {
            res.render("index", {error: "You're sending too many requests."});
        }
        else if(response.status == 503 || response.status == 500 || response.status == 400) {
            res.render("index", {error: "Internal server error, try again later."});
        }
        else {
		if(req.query['api'] == 'true') {
		res.json(returnData(response.data, parseui.parseUserAgent(req.get("User-Agent"))))
		}
		else {
		res.render("index", {data: returnData(response.data, parseui.parseUserAgent(req.get("User-Agent")))});
		}
        }
    })
    .catch(function (error) {
        res.render("index", {error: "An unexpected error has occured, try again."});
    });
})

function returnData(data, useragent) {
    let array = {
        ip_address: data.ip_address,
        connection_type: data.connection.connection_type,
        isp: data.connection.isp_name,
        is_vpn: data.security.is_vpn,
        browser: `${useragent.browser_name} (${useragent.browser_version})`,
        os: `${useragent.operating_system_name} ${useragent.operating_system_version}`,
        timezone: data.timezone.name,
        country: data.country,
        region: data.region,
        city: data.city,
        postal_code: data.postal_code,
        longitude: data.longitude,
        latitude: data.latitude
    };
    return array;
}

app.listen(3001);

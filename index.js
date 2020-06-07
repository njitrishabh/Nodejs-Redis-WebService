//Import packages
const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");
const { apiLimiter } = require('./middlewares/rateLimiter');
const cors = require('cors');

const PORT = process.env.PORT || 9000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const DOI = process.env.DOI || "10.2196/12121";
const dbId = process.env.dbId || 31115346;

const app = express();
const redisClient = redis.createClient(REDIS_PORT);


const getCrossRefCache = (req, res, next) => {
    let key = req.query.DOI;
    if (key == null) {
        key = DOI;
    }

    redisClient.get(key, (error, data) => {
        if (error) {
            res.status(400).send(err);
        }
        if (data != null) {
            res.status(200).send(JSON.parse(data));
        }
        else next();
    });
}

const setCrossRefCache = (key, value) => {
    redisClient.setex(key, 3600, JSON.stringify(value));
}

async function getCrossRefResponse(req, res, next) {
    try {
        let doi = req.query.DOI;
        if (doi == null) {
            doi = DOI;
        }
        const response = await fetch(`http://api.crossref.org/works/${doi}`);
        const data = await response.json();
        setCrossRefCache(doi, data);
        res.status(200).send(data);
    } catch (error) {
        res.status(400).send(error);
    }
}



const getPubmedCache = (req, res, next) => {
    let key = req.query.id;
    if (key == null) {
        key = dbId;
    }

    redisClient.get(key, (error, data) => {
        if (error) {
            res.status(400).send(err);
        }
        if (data != null) {
            res.status(200).send(data);
        }
        else next();
    });
}

const setPubmedCache = (key, value) => {
    redisClient.setex(key, 3600, value);
}

async function getPubmedResponse(req, res, next) {
    try {
        let id = req.query.id;
        if (id == null) {
            id = dbId;
        }
        await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi/?db=pubmed&id=${id}`)
            .then(res => res.text())
            .then(data => {
                setPubmedCache(id, data);
                res.status(200).send(data);
            });
    } catch (error) {
        res.status(400).send(error);
    }
}

app.use(cors());
app.use("/crossref/works", apiLimiter);
app.get("/crossref/works", getCrossRefCache, getCrossRefResponse);
app.get("/pubmed", apiLimiter, getPubmedCache, getPubmedResponse);

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}...`);
});
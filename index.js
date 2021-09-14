const { Octokit } = require("@octokit/core");
const fs = require('fs');
require('dotenv').config()

// some contants
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const USERNAME= process.env.USERNAME;
const BLOG_URL = process.env.BLOG_URL;

// Fetches language stats from github
const fetchRepositoryLanguageTotals = async () => {
    const result = await octokit.request('GET /users/{user}/repos', {
        user: USERNAME
    });

    // languages returns how man bytes of each language file
    const repositoryLanguages = await Promise.all(result.data.map((repo) => (
        octokit.request('GET /repos/{owner}/{repo}/languages', {
            owner: USERNAME,
            repo: repo.name
        })
    )));

    // totals languages across the projects
    const totals = {};
    let byteTotal = 0;
    repositoryLanguages.forEach(({ data }) => {
        Object.keys(data).forEach((key) => {
            if (totals[key] === undefined) {
                totals[key] = 0;
            }
            totals[key] += data[key];
            byteTotal += data[key]
        })
    });

    return {
        totals,
        byteTotal
    };
};

(async () => {
    // stores the text we'll save to the readme file later
    let readmeContents;

    // adds a line prepended with a newline character
    const addMarkdown = (line) => {
        if (readmeContents === undefined) {
            readmeContents = line;
            return;
        }
        readmeContents = readmeContents.concat(" - " + line);
    }

    console.log("> Getting GitHub language statistics");
    const { totals, byteTotal } = await fetchRepositoryLanguageTotals();

    // grab the largest language in bytes
    let largestBytes = 0;
    let largestLanguage;
    Object.keys(totals).forEach((language) => {
        if (totals[language] > largestBytes) {
            largestBytes = totals[language];
            largestLanguage = language;
        }
    });

    addMarkdown(`<a href="https://github.com/${USERNAME}?tab=repositories">side projects</a>`)
    addMarkdown(`<a href="${BLOG_URL}">my blog</a>`);
    addMarkdown(`<a href="https://codepen.io/${USERNAME}">web experiments</a>`);
    addMarkdown(`<a href="https://codesandbox.io/u/${USERNAME}">testing ground</a>`);
    addMarkdown(`${largestLanguage} at ${((largestBytes / byteTotal) * 100).toFixed(2)}%`);
    
    console.log("> Writing language statistics");
    fs.writeFileSync('./README.md', `<p align="center">${readmeContents}</p>`);
    console.log("> Done");
})();

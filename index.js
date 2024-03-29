import { Octokit } from "@octokit/core";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config()
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// grabs information about the user associated with the loaded token
const fetchUserInformation = async () => {
    const { data: user } = await octokit.request('GET /user');

    return {
        blog: user.blog,
        username: user.login
    };
};

// Fetches language stats from github
const fetchRepositoryLanguageTotals = async (username) => {
    const result = await octokit.request('GET /users/{user}/repos', {
        user: username
    });

    // languages returns how man bytes of each language file
    const repositoryLanguages = await Promise.all(result.data.map((repo) => (
        octokit.request('GET /repos/{owner}/{repo}/languages', {
            owner: username,
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
    // builds our content for the readme file
    let readmeContents;
    const addMarkdown = (line) => {
        if (readmeContents === undefined) {
            readmeContents = line;
            return;
        }
        readmeContents = readmeContents.concat(" - " + line);
    }

    console.log("> Getting GitHub language statistics");
    const { username, blog } = await fetchUserInformation();
    const { totals, byteTotal } = await fetchRepositoryLanguageTotals(username);

    // grab the largest language in bytes
    let largestBytes = 0;
    let largestLanguage;
    Object.keys(totals).forEach((language) => {
        if (totals[language] > largestBytes) {
            largestBytes = totals[language];
            largestLanguage = language;
        }
    });

    addMarkdown(`<a href="https://github.com/${username}?tab=repositories">side projects</a>`)
    addMarkdown(`<a href="${blog}">my blog</a>`);
    addMarkdown(`<a href="https://codepen.io/${username}">web experiments</a>`);
    addMarkdown(`<a href="https://codesandbox.io/u/${username}">testing ground</a>`);
    addMarkdown(`${largestLanguage} at ${((largestBytes / byteTotal) * 100).toFixed(2)}%`);
    
    console.log("> Writing language statistics");
    fs.writeFileSync('./README.md', `<p align="center">${readmeContents}</p>`);
    console.log("> Done");
})();

const { Octokit } = require("@octokit/core");
const fs = require('fs');

const octokit = new Octokit();
const GITHUB_USERNAME = "dayvidwhy";

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

addMarkdown(`[side projects](https://github.com/dayvidwhy?tab=repositories)`)
addMarkdown(`[my blog](https://davidyoung.tech)`);
addMarkdown(`[web experiments](https://codepen.io/dayvidwhy)`);
addMarkdown(`[testing ground](https://codesandbox.io/u/dayvidwhy)`);

(async () => {
    // fetches language stats from github
    const result = await octokit.request('GET /users/{user}/repos', {
        user: GITHUB_USERNAME
    });
    const langs = await Promise.all(result.data.map((repo) => (
        octokit.request('GET /repos/{owner}/{repo}/languages', {
            owner: GITHUB_USERNAME,
            repo: repo.name
        })
    )));
    const repoLanguages = langs.map(lang => lang.data);

    // totals languages across the projects
    const totals = {};
    let lineTotal = 0;
    repoLanguages.forEach((repo) => {
        Object.keys(repo).forEach((key) => {
            if (totals[key] === undefined) {
                totals[key] = 0;
            }
            totals[key] += repo[key];
            lineTotal += repo[key]
        })
    });

    const langPairs = [];
    Object.keys(totals).forEach((lang) => {
        langPairs.push([lang, ((totals[lang] / lineTotal) * 100).toFixed(2)]);
    });
    langPairs.sort((a, b) => {
        return b[1] - a[1]
    });
    langPairs.slice(0, 1).forEach((langPair) => {
        addMarkdown(`${langPair[0]} at ${langPair[1]}%`)
    });

    fs.writeFileSync('./README.md', readmeContents);
})();

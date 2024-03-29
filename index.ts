import { Octokit } from "@octokit/core";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

interface UserInformation {
    blog: string;
    username: string;
}

/**
 * Grabs information about the user associated with the loaded token.
 * @returns UserInformation
 */
const fetchUserInformation = async (): Promise<UserInformation> => {
    const { data: user } = await octokit.request("GET /user");
    return {
        blog: user.blog,
        username: user.login
    };
};

/**
 * Fetches language stats from github.
 * @param username Username of user to request stats for.
 * @returns 
 */
const fetchRepositoryLanguageTotals = async (username): Promise<{
    totals: Record<string, number>,
    byteTotal: number
}> => {
    const result = await octokit.request("GET /users/{user}/repos", {
        user: username
    });

    // languages returns how man bytes of each language file
    const repositoryLanguages = await Promise.all(result.data.map((repo) => (
        octokit.request("GET /repos/{owner}/{repo}/languages", {
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
            byteTotal += data[key];
        });
    });

    return {
        totals,
        byteTotal
    };
};

/**
 * Initiate script to fetch current language stats from github.
 */
(async (): Promise<void> => {
    // builds our content for the readme file
    let readmeContents: string = "";
    const addMarkdown = (line: string) => {
        readmeContents = readmeContents.concat(line);
    };

    const addLink = (url: string, content: string) => {
        readmeContents = readmeContents.concat(`<a href="${url}">${content}</a>`);
    };

    console.log("> Getting GitHub language statistics");
    const { username, blog } = await fetchUserInformation();
    const { totals, byteTotal } = await fetchRepositoryLanguageTotals(username);

    // grab the largest language in bytes
    let largestBytes: number = 0;
    let largestLanguage: string;
    Object.keys(totals).forEach((language) => {
        if (totals[language] > largestBytes) {
            largestBytes = totals[language];
            largestLanguage = language;
        }
    });

    addLink(`https://github.com/${username}?tab=repositories`, "side projects");
    addMarkdown(" - ");
    addLink(blog, "my blog");
    addMarkdown(" - ");
    addLink(`https://codepen.io/${username}`, "web experiments");
    addMarkdown(" - ");
    addLink(`https://codesandbox.io/u/${username}`, "testing ground");
    addMarkdown(" - ");
    addMarkdown(`${largestLanguage} at ${((largestBytes / byteTotal) * 100).toFixed(2)}%`);
    
    console.log("> Writing language statistics");
    fs.writeFileSync("./README.md", `<p align="center">${readmeContents}</p>`);
    console.log("> Done");
})();

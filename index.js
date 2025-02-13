const puppeteer = require('puppeteer');
const axios = require('axios');
const mysql = require('mysql2/promise');
const cron = require('node-cron');
require("dotenv").config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const VELOG_TREND_URL = 'https://velog.io/trending';

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    database: process.env.DB_SCHEMA,
    port: process.env.DB_PORT
};

async function initializeDatabase() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('🚀 mysql 커넥션 연결 완료. ');
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS posts (
            id VARCHAR(255) PRIMARY KEY,
            title TEXT,
            url TEXT
        )
    `);

    console.log('🚀 mysql 테이블 준비 완료 ');
    await connection.end();
}

async function scrapeVelogTrending() {
    const browser = await puppeteer.launch({ 
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
     });

    const page = await browser.newPage();
    await page.goto(VELOG_TREND_URL);

    await page.waitForSelector("[class*='PostCard_h4']");

    const articles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("[class*='PostCard_block']"))
            .map(a => ({
                id: decodeURI(a.querySelector("a")?.href).split("/").pop(),
                title: a.querySelector("[class*='PostCard_h4']")?.innerText.trim() || 'No Title',
                url: decodeURI(a.querySelector("a")?.href)
            })).filter(a => a.title !== 'No Title' );
    });
    
    await browser.close();
    return articles;
}

async function checkAndNotifyNewPosts() {
    const connection = await mysql.createConnection(dbConfig);
    const newPosts = [];
    console.log('scrap date : ', new Date());
    const articles = await scrapeVelogTrending();
    for (const article of articles) {
        const [rows] = await connection.execute('SELECT * FROM posts WHERE id = ?', [article.id]);
        
        if (rows.length === 0) {
            newPosts.push(article);
            await connection.execute('INSERT INTO posts (id, title, url) VALUES (?, ?, ?)', [article.id, article.title, article.url]);
        }
    }

    await connection.end();
    
    if (newPosts.length > 0) {
        console.log("new articles : ", newPosts);
        sendNewPostsNotifications(newPosts);
    }
}

// Discord Webhook 알림 전송
async function sendNewPostsNotifications(posts) {
    
    const message = {
        content: `📢 Velog 트렌드에 새로운 글이 올라왔어요!\n\n` +
            posts.map(p => `**${p.title}**\n🔗 [보기](${encodeURI(p.url)})`).join('\n\n')
    };
    
    const alertMessage = getMessage(`📢 Velog 트렌드에 새로운 글이 올라왔어요!\n\n`);
    await sendDiscordNotification(alertMessage);

    await sleep(500);

    for(const post of posts) {
        const postMessage = getPostMessage(post);
        await sendDiscordNotification(postMessage);
        await sleep(500);
    }
    
}

async function sendDiscordNotification(message) {
    try {
        await axios.post(DISCORD_WEBHOOK_URL, message);
        console.log('✅ 알림 전송 완료');
    } catch (err) {
        console.error('❌ 알림 전송 실패:', err.response?.data || err.message);
    }
}

function sleep(ms) {
    return new Promise(resolve=>{
        setTimeout(resolve, ms);
    })
}


function getMessage(content) {
    return {content}
}

function getPostMessage(post) {
    return getMessage(`**${post.title}**\n 🔗 [보기](${encodeURI(post.url)})`);
}

(async () => {
    await initializeDatabase();
    console.log('🚀 Velog 크롤러 실행 중...');
    await cronExecute();
})();


async function cronExecute() {
    cron.schedule('*/5 * * * *', async () => {
        console.log('🔍 Velog 트렌드 크롤링 중...');
        await checkAndNotifyNewPosts();
    });
}

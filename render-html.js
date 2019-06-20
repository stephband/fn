const puppeteer = require("puppeteer");
const fs = require("fs");

(async (source, target, time) => {
  if (!process.argv[2] || !process.argv[3]) {
    throw new Error("function required two arguments");
  }
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();
  await page.goto(source);
  setTimeout(async function() {
    let doc = await page.evaluate(() => {
      return "<!DOCTYPE html>" + document.documentElement.outerHTML;
    });
    target = fs.writeFile(target, doc, function(err) {
      if (err) throw err;
      else {
        process.exit();
      }
    });
  }, parseFloat(time) * 1000);
})(process.argv[2], process.argv[3], process.argv[4]);

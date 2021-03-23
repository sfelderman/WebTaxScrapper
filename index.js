const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");
const input = require("./input.js");

const { formAccountUrl, formSearchUrl, substringFrom } = require("./helpers");

let browser;
let count = 1;

const accounts = {};

const findAccountDetails = async (accountCode, address, accountPage) => {
	accounts[accountCode] = { id: accountCode };
	const account = accounts[accountCode];

	const url = formAccountUrl(accountCode);
	await accountPage.goto(url);

	const content = await accountPage.content();

	const $ = cheerio.load(content);

	account.assessedValues = {
		land: substringFrom(
			$('span:contains("Land")')
				.text()
				.trim(),
			": "
		),
		improvements: substringFrom(
			$('span:contains("Improvements")')
				.text()
				.trim(),
			": "
		),
		exemptions: substringFrom(
			$('span:contains("Exemptions")')
				.text()
				.trim(),
			": "
		),
		totalTaxableValue: substringFrom(
			$('span:contains("Total Taxable Value")')
				.text()
				.trim(),
			": "
		)
	};
	account.address = address; // substringFrom($('.gsgx-account-header-title-text').text().trim(), 'Property Tax Account at ');

	account.history = {};
	const historyNodes = $(".gsgx-bill-link > a")
		.get()
		.map(
			node => node.children[0].nodeValue.trim().split(" ")[0] // get just year
		);
	const paymentNodes = $(".gsgx-installment-amount")
		.get()
		.map(node => node.children[0].nodeValue.trim().substring(1).replace(/\,/g, ''));

	historyNodes.forEach((year, index) => {
    const total = (parseFloat(paymentNodes[index * 2]) + parseFloat(paymentNodes[index * 2 + 1])).toFixed(2);
		account.history[year] =  total;
	});

	return account;
};

const getAccountNumAndAddresses = (address, $) => {
	const accountNumAndAddresses = $(".gsgx-account-owner.account-owner");

	return accountNumAndAddresses
		.map(function() {
			const fullText = $(this)
				.text()
				.trim();
			const [, accountCode, curAddress, rest] = fullText.match(
				/^Account (\S*)\ *at\ (.*)/
			);
			return {
				accountCode,
				curAddress
			};
		})
		.filter(function(index, { curAddress }) {
			return curAddress.toLowerCase() === address.toLowerCase();
		})
		.get()[0]; // only will be one element
};

const writeDetails = async ({ assessedValues, address, history }) => {
	const { land, improvements, exemptions, totalTaxableValue } = assessedValues;
	const values = [address, land, improvements, exemptions, totalTaxableValue];

	const sortedHistoryKeys = Object.keys(history).sort((a, b) => b - a);
	sortedHistoryKeys.forEach(key => {
		values.push(history[key]);
  });

  const str = values.join(',') + '\n';

	await fs.appendFile("output.txt", str, err => {
		if (err) {
			console.error(err);
			return;
		}
		//file written successfully
    console.log("Wrote for : " + address + '  ---- ' + count);
    count++;
	});
};

async function main() {
	fs.writeFile("output.txt", "", err => {
		if (err) throw err;
	});

	browser = await puppeteer.launch({
		headless: true
	});

	const page = await browser.newPage();

	const addresses = input;

	for (const address of addresses) {
		const url = formSearchUrl(address);
		await page.goto(url);

		const content = await page.content();

		const $ = cheerio.load(content);

    const res = getAccountNumAndAddresses(address, $);

    if (!(res && res.accountCode && res.curAddress)) {
      console.log('FAILED: ' + address + '    ------------------------------------------------' + count);
      count++;
    } else {

      const {accountCode, curAddress} = res
      const accountDetails = await findAccountDetails(accountCode, curAddress, page);

      await writeDetails(accountDetails);
    }
	}

	console.log("Finished");
	browser.close();
}

console.log("Running...");
main();

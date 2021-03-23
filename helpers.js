const BASE_URL = process.env.BASE_URL;

const SEARCH_PREFIX = BASE_URL + 'search?search_query=';
const SEARCH_SUFFIX = '&category=all';

const ACCOUNT_PREFIX = BASE_URL + 'property_tax/accounts/';

module.exports = {
  formSearchUrl: (search) => SEARCH_PREFIX + search.split(' ').join('+') + SEARCH_SUFFIX,
  formAccountUrl: (account) => ACCOUNT_PREFIX + account,
  substringFrom: (string, search, clean = true) => {
    const str = string.substring(string.indexOf(search) + search.length);
    if (clean) {
      return str.replace(/\$/g, '').replace(/\,/g, '');
    }
    return str;
  }
};
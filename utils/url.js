/**
 * Make a Regex that will detect whether the URL in the parameter is present or not.
 * For example usages, see other downloaders' search functions.
 */
const makeURLRegex = (url) => new RegExp(
    url
    .replace(/(http(s|))/, 'http(s|)')
    .replace(/\./gm, '\\.')
    .replace(/\//gm, '\\/')
, "gm");

export { makeURLRegex };
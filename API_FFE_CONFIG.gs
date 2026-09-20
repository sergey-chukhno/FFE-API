/*************************************************************
 * CONFIGURATION
 *************************************************************/
const DEBUG = true;
const OPTIMIZED = false;
const WITH_FIDE = false;

/*************************************************************
 * CONFIGURATION CHESSXP API
 *************************************************************/
const CHESSXP_CONFIG = {
  BASE_URL: "https://ffe.chessxp.com",
  API_KEY: "cxp_live_nRngSzJKufKfxVjLGRRDPRBNQ5YvwAGmi_1Jylboivg",
  TIMEOUT_MS: 10000,
  DEFAULT_SEARCH_LIMIT: 50,
  INCLUDE_FIDE_DEFAULT: true
};

/**
 * STRING_STRICT_COMPARE
 *
 * false (default):
 *   - insensitive to case
 *   - ignores accents
 *   - treats space and hyphen as equivalent
 *   - generates search variants
 *
 * true:
 *   - strict string matching
 *   - case-sensitive
 *   - no normalization
 *   - no variants generated
 */
const STRING_STRICT_COMPARE = false;

const FETCH_ANTI_BOT = true;

/*************************************************************
 * CONFIG HTTP CENTRALISEE
 *************************************************************/

const HTTP_CONFIG = {
  HEADERS: {
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  OPTIONS_GET: {
    method: "get",
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  },
  OPTIONS_POST: {
    method: "post",
    muteHttpExceptions: true,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }
};
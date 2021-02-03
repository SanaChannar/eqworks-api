const moment = require('moment')

const WINDOW_SIZE_IN_HOURS = 1;
const MAX_WINDOW_REQUEST_COUNT = 20;
const WINDOW_LOG_INTERVAL_IN_HOURS = 1;

let map = new Map();

module.exports = (req, res, next) => {
  try {

    // fetch records of current user using IP address, returns null when no record is found
    let record = map.get(req.ip)
    const currentRequestTime = moment();
    console.log(record);

    //  if no record is found , create a new record for user and store to map
    if (!record) {
      let newRecord = [];
      let requestLog = {
        requestTimeStamp: currentRequestTime.unix(),
        requestCount: 1
      };
      newRecord.push(requestLog);
      map.set(req.ip, JSON.stringify(newRecord));
      next();
    } else {
      // if record is found, parse it's value and calculate number of requests users has made within the last window
      let data = JSON.parse(record);
      let windowStartTimestamp = moment()
        .subtract(WINDOW_SIZE_IN_HOURS, 'hours')
        .unix();
      let requestsWithinWindow = data.filter(entry => {
        return entry.requestTimeStamp > windowStartTimestamp;
      });

      console.log('requestsWithinWindow', requestsWithinWindow);
      let totalWindowRequestsCount = requestsWithinWindow.reduce((accumulator, entry) => {
        return accumulator + entry.requestCount;
      }, 0);

      // if number of requests made is greater than or equal to the desired maximum, return error
      if (totalWindowRequestsCount >= MAX_WINDOW_REQUEST_COUNT) {
        res.status(500)
        res.send(`You have exceeded the ${MAX_WINDOW_REQUEST_COUNT} requests in ${WINDOW_SIZE_IN_HOURS} hr limit!`);
      } else {
        // if number of requests made is less than allowed maximum, log new entry
        let lastRequestLog = data[data.length - 1];
        let potentialIntervalStartTime = currentRequestTime.subtract(WINDOW_LOG_INTERVAL_IN_HOURS, 'hours').unix();

        //  if interval has not passed since last request log, increment counter
        if (lastRequestLog.requestTimeStamp > potentialIntervalStartTime) {
          lastRequestLog.requestCount++;
          data[data.length - 1] = lastRequestLog;
        } else {

          //  if interval has passed, log new entry for current user and timestamp
          data.push({
            requestTimeStamp: currentRequestTime.unix(),
            requestCount: 1
          });
        }
        map.set(req.ip, JSON.stringify(data));
        next();
      }
    }

  } catch (error) {
    next(error);
  }
};
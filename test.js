const _ = require("lodash");

let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

let c1 = _.slice(nums, 2, 6);
console.log(c1);

let c2 = _.slice(nums, 0, 8);
console.log(c2);
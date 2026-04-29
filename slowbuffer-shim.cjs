"use strict";

const buffer = require("buffer");

if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}

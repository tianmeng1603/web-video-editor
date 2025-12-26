module.exports = function override(config, env) {
  // 添加对 .mjs 文件的支持
  config.module.rules.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: "javascript/auto",
  });

  // 允许解析 .mjs 文件
  config.resolve.extensions.push(".mjs");

  return config;
};

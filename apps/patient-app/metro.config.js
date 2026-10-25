const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const reactNativeEntry = path.resolve(projectRoot, "node_modules/react-native/index.js");
const safeAreaEntry = path.resolve(
  projectRoot,
  "node_modules/react-native-safe-area-context",
);

const config = getDefaultConfig(projectRoot);

// Use isolated cache directory to prevent Windows Temp folder file locks
const FileStore = require("metro-cache").FileStore;
config.cacheStores = [
  new FileStore({
    root: path.resolve(projectRoot, ".metro-cache"),
  }),
];

// Keep bundling isolated to this app's dependencies on Windows.
config.watchFolders = [projectRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

// Force local React Native, safe-area, and React 18 dependencies.
const react18Map = {
  "react": path.resolve(projectRoot, "node_modules/react/index.js"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom/index.js"),
  "react/jsx-runtime": path.resolve(projectRoot, "node_modules/react/jsx-runtime.js"),
  "react/jsx-dev-runtime": path.resolve(projectRoot, "node_modules/react/jsx-dev-runtime.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native") {
    return {
      filePath: reactNativeEntry,
      type: "sourceFile",
    };
  }
  if (moduleName.startsWith("react-native/")) {
    return {
      filePath: require.resolve(moduleName, {
        paths: [path.resolve(projectRoot, "node_modules")],
      }),
      type: "sourceFile",
    };
  }
  if (
    moduleName === "react-native-safe-area-context" ||
    moduleName.startsWith("react-native-safe-area-context/")
  ) {
    const subpath = moduleName.slice("react-native-safe-area-context".length);
    return {
      filePath: require.resolve(
        path.resolve(safeAreaEntry, subpath.slice(1) || "lib/commonjs/index.js"),
      ),
      type: "sourceFile",
    };
  }
  if (react18Map[moduleName]) {
    return {
      filePath: react18Map[moduleName],
      type: "sourceFile",
    };
  }
  if (moduleName.startsWith("react-dom/")) {
    const sub = moduleName.replace("react-dom/", "");
    const candidate = path.resolve(projectRoot, `node_modules/react-dom/${sub}.js`);
    return {
      filePath: candidate,
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.blockList = [
  /.*[/\\]apps[/\\](nurse-portal|patient-portal)[/\\].*/,
  /.*[/\\]\.next[/\\].*/,
];

module.exports = config;

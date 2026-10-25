// MUST be the first import: React Native's built-in URL is a stub that throws
// ("URL.protocol is not implemented"), and supabase-js needs a real one.
import "react-native-url-polyfill/auto";

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);

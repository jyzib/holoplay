# Holoplay

A cross-platform React Native streaming app (iOS & Android) powered by [VidAPI](https://vidapi.ru/api). Browse latest movies and TV shows, search by title or IMDB ID, and play content with resume support — all in a Netflix / Prime Video-inspired dark UI.

## Features

- **Home** — Hero banner, horizontal content rows (Latest Movies, TV Shows, Episodes)
- **Search** — Enter any IMDB ID (`tt0944947`) to play movies or TV shows
- **My List** — Continue watching with automatic progress saved locally
- **Player** — Full-screen VidAPI embed with resume, autoplay, and auto next-episode
- **Design** — Dark streaming UI with Netflix red + Prime blue accents

## Requirements

- Node.js 18+ (20 recommended)
- Expo Go app on your phone, or Xcode / Android Studio for simulators

## Getting Started

```bash
# Use Node 20+
nvm use 20

# Install dependencies
npm install

# Start the dev server
npm start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

## IMDB ID Usage

1. Open the **Search** tab
2. Enter an IMDB ID (e.g. `tt0944947` for Game of Thrones)
3. Choose **Movie** or **TV Show**
4. Tap **Play Now** or **View Details**

TV shows include a season/episode picker before playback.

## VidAPI Integration

| Feature | Endpoint |
|---------|----------|
| Latest movies | `vidapi.ru/movies/latest/page-1.json` |
| Latest TV shows | `vidapi.ru/tvshows/latest/page-1.json` |
| Latest episodes | `vidapi.ru/episodes/latest/page-1.json` |
| Movie player | `player.imdb.su/embed/movie/{imdb_id}` |
| TV player | `player.imdb.su/embed/tv/{imdb_id}/{season}/{episode}` |

Progress is tracked via VidAPI `PLAYER_EVENT` postMessage events and stored in AsyncStorage.

## Domain Whitelisting

If playback fails in production builds, add your app domain in the VidAPI dashboard under **Domains → Allowed Sites**. For development with Expo Go, the embed should work out of the box.

## Project Structure

```
app/              # Expo Router screens
components/       # UI components
services/         # VidAPI + watch progress
constants/theme.ts # Design system
types/            # TypeScript types
```

## Tech Stack

- Expo SDK 52 + React Native
- Expo Router (file-based navigation)
- react-native-webview (VidAPI player)
- AsyncStorage (watch progress)

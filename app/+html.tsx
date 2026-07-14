import { type PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import { colors } from '../constants/theme';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                background-color: ${colors.background};
              }
              body {
                overflow: hidden;
                margin: 0;
              }
              #root {
                display: flex;
                flex: 1;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

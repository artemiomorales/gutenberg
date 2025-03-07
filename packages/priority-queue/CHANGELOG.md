<!-- Learn how to maintain this file at https://github.com/WordPress/gutenberg/tree/HEAD/packages#maintaining-changelogs. -->

## Unreleased

## 2.34.0 (2023-05-24)

## 2.33.0 (2023-05-10)

## 2.32.0 (2023-04-26)

## 2.31.0 (2023-04-12)

## 2.30.0 (2023-03-29)

## 2.29.0 (2023-03-15)

## 2.28.0 (2023-03-01)

## 2.27.0 (2023-02-15)

## 2.26.0 (2023-02-01)

## 2.25.0 (2023-01-11)

## 2.24.0 (2023-01-02)

## 2.23.0 (2022-12-14)

## 2.22.0 (2022-11-16)

## 2.21.0 (2022-11-02)

## 2.20.0 (2022-10-19)

## 2.19.0 (2022-10-05)

## 2.18.0 (2022-09-21)

## 2.17.0 (2022-09-13)

## 2.16.0 (2022-08-24)

## 2.15.0 (2022-08-10)

## 2.14.0 (2022-07-27)

## 2.13.0 (2022-07-13)

## 2.12.0 (2022-06-29)

## 2.11.0 (2022-06-15)

## 2.10.0 (2022-06-01)

## 2.9.0 (2022-05-18)

## 2.8.0 (2022-05-04)

## 2.7.0 (2022-04-21)

### New features

-  Add a new `cancel` method that removes scheduled callbacks without executing them.

## 2.6.0 (2022-04-08)

## 2.5.0 (2022-03-23)

## 2.4.0 (2022-03-11)

## 2.3.0 (2022-01-27)

## 2.2.0 (2021-07-21)

## 2.1.0 (2021-05-20)

## 2.0.0 (2021-05-14)

### Breaking Changes

-   Drop support for Internet Explorer 11 ([#31110](https://github.com/WordPress/gutenberg/pull/31110)). Learn more at https://make.wordpress.org/core/2021/04/22/ie-11-support-phase-out-plan/.
-   Increase the minimum Node.js version to v12 matching Long Term Support releases ([#31270](https://github.com/WordPress/gutenberg/pull/31270)). Learn more at https://nodejs.org/en/about/releases/.

## 1.11.0 (2021-03-17)

## 1.6.0 (2020-04-15)

### New feature

-   Include TypeScript type declarations ([#18942](https://github.com/WordPress/gutenberg/pull/18942))

## 1.5.0 (2020-02-04)

### Bug Fixes

-   Resolves an issue where `flush` would not invoke the callback associated with the given element. The previous implementation would simply remove the element from the queue. The updated behavior adheres to what one would expect from a flush as in to complete the deferred execution immediately. With these changes, all callbacks will always (eventually) be invoked unless the application is abruptly terminated. A future version could introduce support for a `remove` function to replicate the previous behavior of `flush`.

## 1.0.0 (2019-03-06)

Initial release.

import { css } from 'emotion'

export const GLOBAL = `
  html, body {
    font-family: sans-serif;
    background: #251533;
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: inherit;
  }
  body {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #C5AEDA;
  }
  #my-app {
    width: 95%;
    max-width: 800px;
    text-align: center;
  }
`

export const refresh = css`
  cursor: pointer;
  text-decoration: underline;
`

export const input = css`
  width: 100%;
  border: none;
  background: none;
  border: 2px solid #D42867;
  font-size: 2em;
  text-align: center;
  padding: 0.5em 1em;
  margin: 0.5em 0;
  outline: none;
  color: #D42867;
  opacity: 0.4;
  transition: 0.2s opacity;
  &::placeholder{
    color: #D42867;
  }
  &:focus {
    opacity: 1;
  }
`

export const list = css`
  padding: 0;
`

export const listItem = css`
  list-style: none;
  margin: 1em 0;
`

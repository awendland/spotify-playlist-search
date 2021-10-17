import { css } from 'emotion'

export const refresh = css`
  cursor: pointer;
  text-decoration: underline;
`

export const inputForm = css`
  position: relative;
`

export const input = css`
  width: 100%;
  border: none;
  background: none;
  border: 2px solid #d42867;
  font-size: 2em;
  text-align: center;
  padding: 0.5em 1em;
  margin: 0.5em 0;
  outline: none;
  color: #d42867;
  opacity: 0.4;
  transition: 0.2s opacity;
  &::placeholder {
    color: #d42867;
  }
  &:focus {
    opacity: 1;
  }
`

export const clearInput = css`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  border: none;
  background: none;
  padding: 0.5em;
  font-size: 2em;
  color: #d42867;
  opacity: 0.4;
  transition: 0.2s opacity;
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

/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.tsx'

console.info(`LinkedInSnap v${__APP_VERSION__}`)

const root = document.getElementById('root')

render(() => <App />, root!)

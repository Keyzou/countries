import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import ReactChartkick from 'react-chartkick';
import Chart from 'chart.js';
import App from './App';
import * as serviceWorker from './serviceWorker';

ReactChartkick.addAdapter(Chart);
ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.register();

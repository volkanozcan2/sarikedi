import React from 'react';

import {createCats, stepCat} from '../../lib/cat-swarm';
import catImage from '../../lib/default-project/209ff3921b8c5a171d514caf15630301.png';
import styles from './about-modal.css';

const CAT_COUNT = 28;
const MAX_FRAME_SECONDS = 0.05;

/**
 * Pencere açıkken arkada zıplayan, dönen onlarca Cool Cat. Pencere kapanınca bileşen kalkar,
 * animasyon durur ve kediler yok olur. Konumlar React dışında, doğrudan stil ile güncellenir.
 */
class CatSwarm extends React.Component {
    constructor (props) {
        super(props);
        this.container = null;
        this.images = [];
        this.cats = [];
        this.frame = null;
        this.last = 0;
        this.setContainer = element => {
            this.container = element;
        };
        this.tick = this.tick.bind(this);
    }
    componentDidMount () {
        const rect = this.container.getBoundingClientRect();
        this.cats = createCats(CAT_COUNT, rect.width, rect.height, Math.random);
        this.images = Array.prototype.slice.call(this.container.children);
        this.draw();
        this.last = window.performance.now();
        this.frame = window.requestAnimationFrame(this.tick);
    }
    componentWillUnmount () {
        window.cancelAnimationFrame(this.frame);
    }
    tick (now) {
        const dt = Math.min(MAX_FRAME_SECONDS, (now - this.last) / 1000);
        this.last = now;
        const rect = this.container.getBoundingClientRect();
        this.cats = this.cats.map(cat => stepCat(cat, rect.width, rect.height, dt));
        this.draw();
        this.frame = window.requestAnimationFrame(this.tick);
    }
    draw () {
        this.cats.forEach((cat, i) => {
            const image = this.images[i];
            image.style.width = `${cat.size}px`;
            image.style.height = `${cat.size}px`;
            image.style.transform = `translate(${cat.x}px, ${cat.y}px) rotate(${cat.angle}deg)`;
        });
    }
    render () {
        const images = [];
        for (let i = 0; i < CAT_COUNT; i++) {
            images.push(
                <img
                    alt=""
                    className={styles.swarmCat}
                    draggable={false}
                    key={i}
                    src={catImage}
                />
            );
        }
        return (
            <div
                aria-hidden="true"
                className={styles.swarm}
                ref={this.setContainer}
            >
                {images}
            </div>
        );
    }
}

export default CatSwarm;

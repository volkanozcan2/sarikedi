/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './author.css';

const LEVEL_LABELS = {baslangic: 'Başlangıç', orta: 'Orta', ileri: 'İleri'};

class AuthorLessonList extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleRowAction']);
    }
    handleRowAction (event) {
        const button = event.currentTarget;
        const id = button.getAttribute('data-id');
        const action = button.getAttribute('data-action');
        if (action === 'edit') this.props.onEdit(id);
        else if (action === 'delete') this.props.onDelete(id);
        else if (action === 'toggle') this.props.onTogglePublished(id);
        else if (action === 'up') this.props.onMove(id, -1);
        else if (action === 'down') this.props.onMove(id, 1);
    }
    renderRow (lesson, index, lessons) {
        const act = (action, label, disabled, extra) => (
            <button
                className={`${styles.button} ${extra || ''}`}
                data-action={action}
                data-id={lesson.id}
                disabled={this.props.busy || disabled}
                onClick={this.handleRowAction}
            >
                {label}
            </button>
        );
        return (
            <tr key={lesson.id}>
                <td>
                    {act('up', '▲', index === 0)}
                    {act('down', '▼', index === lessons.length - 1)}
                </td>
                <td>
                    <strong>{lesson.title}</strong>
                    <div className={styles.muted}>
                        {`${LEVEL_LABELS[lesson.level] || lesson.level} · ${lesson.stepCount} adım · `}
                        {lesson.published ? 'Yayında' : 'Gizli'}
                    </div>
                </td>
                <td>
                    {act('edit', 'Düzenle')}
                    {act('toggle', lesson.published ? 'Gizle' : 'Yayınla')}
                    {act('delete', 'Sil', false, styles.danger)}
                </td>
            </tr>
        );
    }
    render () {
        const {lessons} = this.props;
        return (
            <div>
                <div className={styles.row}>
                    <button
                        className={`${styles.button} ${styles.primary}`}
                        disabled={this.props.busy}
                        onClick={this.props.onNew}
                    >
                        Yeni ders
                    </button>
                    <button
                        className={styles.button}
                        onClick={this.props.onLogout}
                    >
                        Çıkış
                    </button>
                </div>
                {lessons.length === 0 ? <p className={styles.muted}>Henüz ders yok.</p> : (
                    <table className={styles.table}>
                        <tbody>
                            {lessons.map((lesson, index) => this.renderRow(lesson, index, lessons))}
                        </tbody>
                    </table>
                )}
            </div>
        );
    }
}

AuthorLessonList.propTypes = {
    busy: PropTypes.bool,
    lessons: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        level: PropTypes.string,
        stepCount: PropTypes.number,
        published: PropTypes.bool
    })).isRequired,
    onDelete: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired,
    onMove: PropTypes.func.isRequired,
    onNew: PropTypes.func.isRequired,
    onTogglePublished: PropTypes.func.isRequired
};

export default AuthorLessonList;

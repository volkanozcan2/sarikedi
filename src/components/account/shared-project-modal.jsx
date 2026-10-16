/* eslint-disable react/jsx-no-literals */
import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import Modal from '../../containers/modal.jsx';
import {DEFAULT_COVER} from '../../lib/default-cover';
import styles from './account.css';

const ownerText = owner => (owner.role === 'teacher' ? `Öğretmen: ${owner.username}` : owner.username);
const timeText = iso => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('tr-TR', {dateStyle: 'short', timeStyle: 'short'});
};

class SharedProjectModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleComment', 'handleSubmit', 'handleDelete', 'handleReportComment', 'handleReportProject',
            'handleScopeSite', 'handleScopeClass', 'handleUnshare', 'handleRemove'
        ]);
        this.state = {comment: ''};
    }
    handleComment (event) {
        this.setState({comment: event.target.value});
    }
    handleSubmit (event) {
        event.preventDefault();
        this.props.onComment(this.state.comment);
        this.setState({comment: ''});
    }
    handleDelete (event) {
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu yorum silinecek. Emin misin?')) {
            this.props.onDeleteComment(Number(event.currentTarget.getAttribute('data-id')));
        }
    }
    handleReportComment (event) {
        this.props.onReport(Number(event.currentTarget.getAttribute('data-id')));
    }
    handleReportProject () {
        this.props.onReport(null);
    }
    handleScopeSite () {
        this.props.onSetScope('site');
    }
    handleScopeClass () {
        this.props.onSetScope('class');
    }
    handleUnshare () {
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu proje paylaşımdan kaldırılacak. Emin misin?')) this.props.onUnshare();
    }
    handleRemove () {
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu proje kalıcı olarak silinecek. Emin misin?')) this.props.onRemove();
    }
    renderModeration (project) {
        return (
            <div className={styles.moderation}>
                <strong>Öğretmen araçları:</strong>
                <span className={styles.inline}>
                    {project.scope === 'site' ? (
                        <button
                            className={styles.small}
                            data-action="scope-class"
                            onClick={this.handleScopeClass}
                        >
                            Sadece sınıfa aç
                        </button>
                    ) : (
                        <button
                            className={styles.small}
                            data-action="scope-site"
                            onClick={this.handleScopeSite}
                        >
                            Tüm siteye aç
                        </button>
                    )}
                    <button
                        className={styles.smallDanger}
                        data-action="unshare"
                        onClick={this.handleUnshare}
                    >
                        Paylaşımdan kaldır
                    </button>
                    {project.mine ? null : (
                        <button
                            className={styles.smallDanger}
                            data-action="remove-project"
                            onClick={this.handleRemove}
                        >
                            Projeyi sil
                        </button>
                    )}
                </span>
            </div>
        );
    }
    renderComment (comment) {
        return (
            <li
                className={styles.comment}
                key={comment.id}
            >
                <div>
                    <strong>{ownerText(comment.author)}</strong>
                    <span className={styles.realName}>{timeText(comment.createdAt)}</span>
                    <div>{comment.body}</div>
                </div>
                <span className={styles.inline}>
                    {comment.canDelete ? (
                        <button
                            className={styles.smallDanger}
                            data-action="delete-comment"
                            data-id={comment.id}
                            onClick={this.handleDelete}
                        >
                            Sil
                        </button>
                    ) : null}
                    {comment.mine ? null : (
                        <button
                            className={styles.small}
                            data-action="report-comment"
                            data-id={comment.id}
                            onClick={this.handleReportComment}
                        >
                            Bildir
                        </button>
                    )}
                </span>
            </li>
        );
    }
    render () {
        const project = this.props.project;
        return (
            <Modal
                className={styles.wideModal}
                contentLabel={project.title}
                headerClassName={styles.header}
                id="sharedProjectModal"
                onRequestClose={this.props.onClose}
            >
                <div className={styles.body}>
                    <div className={styles.inline}>
                        <button
                            className={styles.small}
                            data-action="back"
                            onClick={this.props.onBack}
                        >
                            ← Paylaşılanlar
                        </button>
                    </div>
                    <div className={styles.detailHead}>
                        <img
                            alt=""
                            className={styles.detailImage}
                            src={project.hasThumbnail ? `/api/shared/${project.id}/thumbnail` : DEFAULT_COVER}
                        />
                        <div>
                            <h3 className={styles.detailTitle}>{project.title}</h3>
                            <div className={styles.realName}>{ownerText(project.owner)}</div>
                            <div className={styles.inline}>
                                <button
                                    className={styles.primaryInline}
                                    data-action="open-copy"
                                    disabled={this.props.busy}
                                    onClick={this.props.onOpenCopy}
                                >
                                    Kopyasını aç
                                </button>
                                <button
                                    className={project.liked ? styles.liked : styles.small}
                                    data-action="like"
                                    disabled={this.props.busy}
                                    onClick={this.props.onLike}
                                >
                                    {`♥ ${project.likes}`}
                                </button>
                                {project.mine ? (
                                    <button
                                        className={styles.smallDanger}
                                        data-action="remove-project"
                                        onClick={this.handleRemove}
                                    >
                                        Projeyi sil
                                    </button>
                                ) : null}
                                {project.mine ? null : (
                                    <button
                                        className={styles.small}
                                        data-action="report-project"
                                        onClick={this.handleReportProject}
                                    >
                                        Bildir
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    {project.canModerate ? this.renderModeration(project) : null}
                    {this.props.error ? <div className={styles.error}>{this.props.error}</div> : null}
                    {this.props.message ? <div className={styles.notice}>{this.props.message}</div> : null}
                    <h4 className={styles.sectionTitle}>{`Yorumlar (${project.comments.length})`}</h4>
                    <ul className={styles.comments}>
                        {project.comments.length === 0 ? <li className={styles.hint}>Henüz yorum yok.</li> : null}
                        {project.comments.map(comment => this.renderComment(comment))}
                    </ul>
                    <form
                        className={styles.inline}
                        onSubmit={this.handleSubmit}
                    >
                        <input
                            className={styles.input}
                            data-field="comment"
                            maxLength="300"
                            placeholder="Güzel bir yorum yaz..."
                            type="text"
                            value={this.state.comment}
                            onChange={this.handleComment}
                        />
                        <button
                            className={styles.small}
                            disabled={this.props.busy}
                            type="submit"
                        >
                            Gönder
                        </button>
                    </form>
                </div>
            </Modal>
        );
    }
}

SharedProjectModal.propTypes = {
    busy: PropTypes.bool,
    error: PropTypes.string,
    message: PropTypes.string,
    onBack: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onComment: PropTypes.func.isRequired,
    onDeleteComment: PropTypes.func.isRequired,
    onLike: PropTypes.func.isRequired,
    onOpenCopy: PropTypes.func.isRequired,
    onReport: PropTypes.func.isRequired,
    onSetScope: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onUnshare: PropTypes.func.isRequired,
    project: PropTypes.shape({
        id: PropTypes.number,
        title: PropTypes.string,
        likes: PropTypes.number,
        liked: PropTypes.bool,
        mine: PropTypes.bool,
        scope: PropTypes.string,
        canModerate: PropTypes.bool,
        hasThumbnail: PropTypes.bool,
        owner: PropTypes.shape({username: PropTypes.string, role: PropTypes.string}),
        comments: PropTypes.array
    }).isRequired
};

export default SharedProjectModal;

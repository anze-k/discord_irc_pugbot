import WordCo from './word_co';

class OpJoin {
    constructor(parent) {
        this.parent = parent;
    }

    exec(channelKey) {
        let operRef = this.parent,
            catRef,
            wRef,
            result,
            cStk = this.parent.cStk,
            partRef = this.parent.partRef;

        if (operRef.logicState != 0) {
            partRef.noticeMessage(
                operRef,
                WordCo.cre().text('Cannot join - pug starting!')
            );
        } else {
            catRef = null;

            if (cStk.pts.length > 0) {
                catRef = operRef.getCatRef(false, cStk.popMod(false));

                if (!catRef) {
                    partRef.noticeMessage(
                        operRef,
                        WordCo.cre()
                            .text('No such pug ')
                            .texth(cStk.last())
                            .text('!')
                    );
                }
            } else {
                catRef = operRef.getCatRef(channelKey);

                if (!catRef) {
                    partRef.noticeMessage(
                        operRef,
                        WordCo.cre().text('No available pugs in this channel!')
                    );
                }
            }

            if (!catRef) {
                // skip ...
            } else if (catRef.channelKey != channelKey) {
                partRef.noticeMessage(
                    operRef,
                    WordCo.cre()
                        .text('Please join channel ')
                        .channelLink(
                            operRef.botRef.channels[catRef.channelKey],
                            '',
                            ''
                        )
                        .text(' first to join ')
                        .texth(catRef.flag)
                        .text(' pug!')
                );
            } else if (
                (wRef = catRef.testParticipantTimeout(partRef)) != null
            ) {
                partRef.noticeMessage(operRef, wRef);
            } else if (
                operRef.botRef.ircAuthUserOnly &&
                !partRef.getAuthKeyRelevant()
            ) {
                partRef.noticeMessage(
                    operRef,
                    WordCo.cre()
                        .text('Only authed users are allowed to join ')
                        .texth(catRef.flag)
                        .text(' pug!')
                );
            } else {
                result = catRef.joinParticipant(partRef);

                if (result == -1) {
                    partRef.noticeMessage(
                        operRef,
                        WordCo.cre()
                            .text('You allready joined to ')
                            .texth(catRef.flag)
                            .text(' pug!')
                    );
                } else if (result == -2) {
                    partRef.noticeMessage(
                        operRef,
                        WordCo.cre()
                            .text('You cannot join to ')
                            .texth(catRef.flag)
                            .text(' pug - capacity is full! (')
                            .texth(catRef.playerLimit)
                            .text(')')
                    );
                } else if (result == 0 || result == 1) {
                    partRef.noticeMessage(
                        operRef,
                        WordCo.cre()
                            .text('You joined to ')
                            .texth(catRef.flag)
                            .text(' pug.')
                    );
                }

                if (result == 1) {
                    operRef.startSelectCaptains(catRef);
                }
            }
        }
    }
}

export default OpJoin;

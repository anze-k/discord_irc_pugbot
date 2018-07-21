import WordCo from './word_co';

class OpDelCmd {
    constructor(parent) {

        this.parent = parent;

    }

    exec() {
        let operRef = this.parent, cmdName, cStk = this.parent.cStk, partRef = this.parent.partRef, privPartRef = this.parent.privPartRef;

        if ((cmdName = cStk.pop()) == null) {
            partRef.noticeMessage(operRef, WordCo.cre().text('No command specified!'));

        } else if (operRef.cmds[cmdName]) {
            partRef.noticeMessage(operRef, WordCo.cre().text('Cannot delete command ').texth(cmdName).text('!'));

        } else {
            delete operRef.textCommands[cmdName];
            operRef.saveState();

            partRef.noticeMessage(operRef, WordCo.cre().text('The command ').texth(cmdName).text(' was deleted.'));
        }
    }
}

export default OpDelCmd;
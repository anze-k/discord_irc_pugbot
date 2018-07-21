import WordCo from './word_co';

class OpRule {
    constructor(parent) {

        this.parent = parent;

    }

    exec() {
        let operRef = this.parent, ruleNumb, cStk = this.parent.cStk, partRef = this.parent.partRef, privPartRef = this.parent.privPartRef;

        ruleNumb = parseInt(cStk.pop());
        if (isNaN(ruleNumb)) ruleNumb = 1;

        if (operRef.textCommands["rule" + ruleNumb]) {
            operRef.sendMsg(false, WordCo.cre().text(operRef.textCommands["rule" + ruleNumb]), privPartRef);

        } else {
            operRef.sendMsg(false, WordCo.cre().text('No such rule!'), privPartRef);
        }
    }
}

export default OpRule;
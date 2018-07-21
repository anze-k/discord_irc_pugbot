import WordCo from './word_co';

class OpCaptainForce {
    constructor(parent) {

        this.parent = parent;

    }

    exec() {
        let operRef = this.parent, cStk = this.parent.cStk, partRef = this.parent.partRef, privPartRef = this.parent.privPartRef;
        
        if (operRef.logicState == 1) {

            operRef.captainForce = true;

        }
    }
}

export default OpCaptainForce;
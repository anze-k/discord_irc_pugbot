import irc from 'irc-upd';
import logger from 'winston';
import discord from 'discord.js';
import Bot from './bot';
import Participant from './participant';
import Catalog from './catalog';
import Team from './team';
import Game from './game';
import WordCo from './word_co';
import CmdStack from './cmd_stack';
import Nouns from './nouns';
import Stats from './stats';
import History from './history';
import Welcome from './welcome';
import VoteOperator from './vote.js';
import PageView from './page_view.js';
import {formatFromDiscordToIRC, formatFromIRCToDiscord} from './formatting';
import {secsAgoFormat} from './helpers';

import OpAbout from './op_about.js';
import OpCommand from './op_command.js';
import OpJoin from './op_join.js';
import OpLeave from './op_leave.js';
import OpAddPlayer from './op_addplayer.js';
import OpDelPlayer from './op_delplayer.js';
import OpRename from './op_rename.js';
import OpAddRandom from './op_addrandom.js';
import OpLva from './op_lva.js';
import OpList from './op_list.js';
import OpDeltag from './op_deltag.js';
import OpTag from './op_tag.js';
import OpHere from './op_here.js';
import OpWelcome from './op_welcome.js';
import OpCaptain from './op_captain.js';
import OpSetCaptain from './op_setcaptain.js';
import OpUnsetCaptain from './op_unsetcaptain.js';
import OpTeams from './op_teams.js';
import OpUnvote from './op_unvote.js';
import OpVote from './op_vote.js';
import OpCaptainForce from './op_captainforce.js';
import OpTurn from './op_turn.js';
import OpPick from './op_pick.js';
import OpLast from './op_last.js';
import OpReset from './op_reset.js';
import OpFullReset from './op_fullreset.js';
import OpAddHistory from './op_addhistory.js';
import OpDelHistory from './op_delhistory.js';
import OpCreatePug from './op_createpug.js';
import OpDeletePug from './op_deletepug.js';
import OpAddCmd from './op_addcmd.js';
import OpDelCmd from './op_delcmd.js';
import OpSay from './op_say.js';
import OpUserInfo from './op_userinfo.js';
import OpPm from './op_pm.js';
import OpNotice from './op_notice.js';
import OpNoun from './op_noun.js';
import OpAuthLevel from './op_authlevel.js';
import OpGrant from './op_grant.js';
import OpDelGrant from './op_delgrant.js';
import OpBan from './op_ban.js';
import OpBanDef from './op_bandef.js';
import OpDelBan from './op_delban.js';
import OpBanList from './op_banlist.js';
import OpDiscord from './op_discord.js';
import OpMention from './op_mention.js';
import OpRules from './op_rules.js';
import OpRule from './op_rule.js';
import OpStats from './op_stats.js';
import OpMyStats from './op_mystats.js';
import OpGetStat from './op_getstat.js';
import OpQuit from './op_quit.js';
import OpRestart from './op_restart.js';
import OpPid from './op_pid.js';
import OpEatStats from './op_eatstats.js';
import OpFlushStats from './op_flushstats.js';

class Operator {
    constructor(botRef, options) {

        this.botRef = botRef;

        this.cats = [];
        // !! this.cats.push(new Catalog("ctf", 4, 2));
        // !! this.cats.push(new Catalog("ctf", 6, 2));
        // !! this.cats.push(new Catalog("tdm", 4, 2));

        this.logicState = 0;

        this.captainTick = 0;
        this.captainForce = false;
        this.captainForcePicked = false;

        this.gameRef = null;
        this.gameCatRef = null;
        
        this.nounRef = new Nouns();
        this.historyRef = new History(this);
        this.welcomeRef = new Welcome(this);
        
        this.statsRef = new Stats(this);
        this.statsRef.createStructure();

        this.voteRef = new VoteOperator(this, 2);
        
        this.playerInactivitySeconds = 60 * 60 * 4;
        this.quickpugInactivitySeconds = 60 * 60;
        // !! this.captainPickSeconds = 20;

        this.captainPickSeconds = 20;

        this.currentCmd = null;
        this.cStk = null;
        this.partRef = null;
        this.privPartRef = null;

        this.ident = options.ident ? options.ident : "bot";
        this.options = options;

        this.htmlPagePath = options.htmlPagePath;
        this.htmlPageUrl = options.htmlPageUrl;

        this.authUsers = {};
        this.banUsers = {};
        this.textCommands = {};

        this.cmds = {
            'about' : {
                'alt' : ['git'], 'auth' : 0, 'inst' : new OpAbout(this),
                'info' : 'Show bot information. Usage: !about'
            },
            'command' : {
                'alt' : ['commands'], 'auth' : 0, 'inst' : new OpCommand(this),
                'info' : 'Shows commands or command details. Usage: !command [command]'
            },
            'join' : {
                'alt' : ['a', 'j', 'add', 'join'], 'auth' : 0, 'inst' : new OpJoin(this),
                'info' : 'Join to pug. Usage: !join [pug]'
            },
            'addplayer' : {
                'auth' : 10, 'inst' : new OpAddPlayer(this),
                'info' : 'Add player to pug. Usage: !addplayer [pug] playername'
            },
            'delplayer' : {
                'auth' : 10, 'inst' : new OpDelPlayer(this),
                'info' : 'Remove player from pug. Usage: !delplayer [pug] playername'
            },
            'rename' : {
                'alt' : [ 'replaceplayer', 'playerreplace' ], 'auth' : 10, 'inst' : new OpRename(this),
                'info' : 'Replace player in pug by someone else. Usage: !rename [pug] player newPlayer'
            },
            'addrandom' : {
                'auth' : 10, 'inst' : new OpAddRandom(this),
                'info' : 'Adds random players to pug. Usage: !addrandom [pug] [playersCount] [tag]'
            },
            'addcustom' : {
                'auth' : 10, 'inst' : new OpAddRandom(this),
                'info' : 'Adds custom imaginary player to pug. Usage: !addrandom [pug] playername [tag]'
            },
            'leave' : {
                'alt' : ['l'], 'auth' : 0, 'inst' : new OpLeave(this),
                'info' : 'Leave pug. Usage: !leave [pug]'
            },
            'lva' : {
                'auth' : 0, 'inst' : new OpLva(this),
                'info' : 'Leave all pugs you joined. Usage: !lva'
            },
            'list' : {
                'alt' : ['ls', 'liast'], 'auth' : 0, 'inst' : new OpList(this),
                'info' : 'List all players which are joined to the pug. Usage: !list [pug]'
            },
            'tag' : {
                'auth' : 0, 'inst' : new OpTag(this),
                'info' : 'Add specific tag to your nick in pug. May use only alphanumeric characters. Usage: !tag [pug] value'
            },
            'deltag' : {
                'auth' : 0, 'inst' : new OpDeltag(this),
                'info' : 'Remove tag from nick. Usage: !deltag [pug]'
            },
            'here' : {
                'auth' : 0, 'inst' : new OpHere(this),
                'info' : 'Refresh your time information to prevent being kicked from inactivity. Usage: !here'
            },
            'welcome' : {
                'auth' : 10, 'inst' : new OpWelcome(this),
                'info' : 'Send welcome message to user. Usage: !welcome playername'
            },
            'captain' : {
                'auth' : 0, 'inst' : new OpCaptain(this),
                'info' : 'Force yourself to become captain (May use only when pug is filled). Usage: !captain'
            },
            'setcaptain' : {
                'auth' : 10, 'inst' : new OpSetCaptain(this),
                'info' : 'Force someone else to become captain (May use only when pug is filled). Usage: !setcaptain playername [color]'
            },
            'unsetcaptain' : {
                'auth' : 10, 'inst' : new OpUnsetCaptain(this),
                'info' : 'Unset captain on some team and roll another one. Usage: !unsetcaptain color'
            },
            'teams' : {
                'auth' : 0, 'inst' : new OpTeams(this),
                'info' : 'Show teams during player picks. Usage: !teams'
            },
            'vote' : {
                'auth' : 0, 'inst' : new OpVote(this),
                'info' : 'Vote for somebody to become a captain (May use only when pug is filled). Usage: !vote playername'
            },
            'unvote' : {
                'auth' : 0, 'inst' : new OpUnvote(this),
                'info' : 'Remove your votes. Usage: !unvote'
            },
            'captainforce' : {
                'auth' : 10, 'inst' : new OpCaptainForce(this),
                'info' : 'Skip waiting and force random captain choose. Usage: !captainforce'
            },
            'turn' : {
                'auth' : 0, 'inst' : new OpTurn(this),
                'info' : 'Display which captain is currently picking players. Usage: !turn'
            },
            'pick' : {
                'alt' : ['p', 'promote'], 'auth' : 0, 'inst' : new OpPick(this),
                'info' : 'Pick player to your team (May use only captain). Usage: !pick playername|playernumber'
            },
            'last' : {
                'alt' : ['lastt', 'lasttt', 'lastttt'], 'auth' : 0, 'inst' : new OpLast(this),
                'info' : 'Display last filled pug. Usage: !last [historycount]'
            },
            'reset' : {
                'auth' : 10, 'inst' : new OpReset(this),
                'info' : 'Reset pug to player picking and captain picking. Usage: !reset [pug]'
            },
            'fullreset' : {
                'auth' : 10, 'inst' : new OpFullReset(this),
                'info' : 'Reset pug to zero players. Usage: !fullreset [pug]'
            },
            'addhistory' : {
                'auth' : 10, 'inst' : new OpAddHistory(this),
                'info' : 'Add pug history entry. Usage: !addhistory [pug] [time] [player1] [player2] [player3] ...'
            },
            'delhistory' : {
                'auth' : 10, 'inst' : new OpDelHistory(this),
                'info' : 'Delete specified history entry. Usage: !delhistory number'
            },
            'createpug' : {
                'auth' : 10, 'inst' : new OpCreatePug(this),
                'info' : 'Create pug. Usage: !createpug pugName playersCount [teamsCount]'
            },
            'quickpug' : {
                'auth' : 0, 'inst' : new OpCreatePug(this),
                'info' : 'Create quickpug (Non-admin players are allowed to create one quickpug). Usage: !quickpug pugName playersCount [teamsCount]'
            },
            'deletepug' : {
                'alt' : ['delpug'], 'auth' : 0, 'inst' : new OpDeletePug(this),
                'info' : 'Delete pug (Non-admin players are allowed to delete only quickpug which they created). Usage: !deletepug pugName'
            },
            'ban' : {
                'auth' : 10, 'inst' : new OpBan(this),
                'info' : 'Ban user. For irc users when using MASK the "playername" represents ban key. Usage: !ban [playername|key] [reason:specified reason] [dur:ban duration in hours] [mask:irc host mask as regex]'
            },
            'bandef' : {
                'auth' : 10, 'inst' : new OpBanDef(this),
                'info' : 'Show ban definition - return ban command for possible update. Usage: !bandef [playername|key]'
            },
            'delban' : {
                'auth' : 10, 'inst' : new OpDelBan(this),
                'info' : 'Delete ban. Usage: !delban [playername|key]'
            },
            'banlist' : {
                'auth' : 0, 'inst' : new OpBanList(this),
                'info' : 'Show banned users.'
            },
            'discord' : {
                'alt' : ['discord_auth'], 'auth' : 0, 'inst' : new OpDiscord(this),
                'info' : 'List available discord players. Usage: !discord'
            },
            'mention' : {
                'auth' : 0, 'inst' : new OpMention(this),
                'info' : 'Mention and highlight user. Usage: !mention playername'
            },
            'rules' : {
                'auth' : 0, 'inst' : new OpRules(this),
                'info' : 'Show rules. Usage: !rules'
            },
            'rule' : {
                'auth' : 0, 'inst' : new OpRule(this),
                'info' : 'Show specific rule. Usage !rule number'
            },
            'stats' : {
                'auth' : 0, 'inst' : new OpStats(this),
                'info' : 'Display pug statistics of specific player. Usage: !stats [pug] playername'
            },
            'mystats' : {
                'auth' : 0, 'inst' : new OpMyStats(this),
                'info' : 'Display your own statistics. Usage: !mystats'
            },
            'getstat' : {
                'auth' : 0, 'inst' : new OpGetStat(this),
                'info' : ''
            },
            'userinfo' : {
                'alt' : ['userinfo2'], 'auth' : 0, 'inst' : new OpUserInfo(this),
                'info' : 'Display user info. Usage: !userinfo playername'
            },
            'authlevel' : {
                'auth' : 0, 'inst' : new OpAuthLevel(this),
                'info' : 'Display your auth-level. Usage: !authlevel'
            },
            'grant' : {
                'auth' : 10, 'inst' : new OpGrant(this),
                'info' : 'Set auth-level to some user. Use negative values to ban. Usage: !grant playername authLevel'
            },
            'delgrant' : {
                'auth' : 10, 'inst' : new OpDelGrant(this),
                'info' : 'Remove user from grant table. Usage: !delgrant playername'
            },
            'addcmd' : {
                'auth' : 10, 'inst' : new OpAddCmd(this),
                'info' : 'Add text command. Usage: !addcmd [command] [text]'
            },
            'delcmd' : {
                'auth' : 10, 'inst' : new OpDelCmd(this),
                'info' : 'Remove text command. Usage: !delcmd [command]'
            },
            'say' : {
                'auth' : 10, 'inst' : new OpSay(this),
                'info' : 'Say message. Usage: !say [message]'
            },
            'quit' : {
                'auth' : 10, 'inst' : new OpQuit(this),
                'info' : 'Quit bot.'
            },
            'restart' : {
                'auth' : 10, 'inst' : new OpRestart(this),
                'info' : 'Restart bot.'
            }
        };

        this.loadState();
        this.historyRef.loadState();
        this.welcomeRef.loadState();
        this.logicLoopTick();

        this.htmlLoopInt = setInterval(() => {

            if (this.botRef.isReady() && this.htmlPagePath) {

                var pRef = new PageView(this);
                pRef.doCompose();

            }

        }, 60 * 1000);
    }

    doQuit() {
        if (this.logicLoopInt) {
            clearTimeout(this.logicLoopInt);
        }

        if (this.htmlLoopInt) {
            clearInterval(this.htmlLoopInt);
        }

        // !! this.saveState();
    }

    toJSON_conf() {
        var result = {
            "cats" : [],
            "authUsers" : this.authUsers,
            "banUsers" : this.banUsers,
            "textCommands" : this.textCommands
        };

        this.cats.forEach((catRef) => {
            result["cats"].push(catRef.toJSON());
        });

        return result;
    }

    fromJSON_conf(input) {
        var key, cPartRef;

        this.authUsers = {};

        if (input["authUsers"]) {
            for (key in input["authUsers"]) {
                this.authUsers[key] = input["authUsers"][key];
            }

        } else if (this.options.authUsers) {
            for (key in this.options.authUsers) {
                this.authUsers[key] = this.options.authUsers[key];
            }
        }

        this.banUsers = {};

        if (input["banUsers"]) {
            for (key in input["banUsers"]) {
                this.banUsers[key] = input["banUsers"][key];

                if (this.banUsers[key]['partRef']) {
                    this.banUsers[key]['partRef'] = Participant.fromJSON(this.banUsers[key]['partRef']);
                }
            }

        } else if (this.options.banUsers) {
            for (key in this.options.banUsers) {
                this.banUsers[key] = this.options.banUsers[key];

                if (this.banUsers[key]['partRef']) {
                    this.banUsers[key]['partRef'] = Participant.fromJSON(this.banUsers[key]['partRef']);
                }
            }
        }

        this.cats = [];

        if (input["cats"] && Array.isArray(input["cats"])) {
            input["cats"].forEach((c) => {
                this.cats.push(Catalog.fromJSON(c));
            });

        } else if (this.options.cats && Array.isArray(this.options.cats)) {
            this.options.cats.forEach((c) => {
                this.cats.push(Catalog.fromJSON(c));
            });
        }

        this.textCommands = {};

        if (input["textCommands"]) {
            for (key in input["textCommands"]) {
                this.textCommands[key] = input["textCommands"][key];
            }

        } else if (this.options.textCommands) {
            for (key in this.options.textCommands) {
                this.textCommands[key] = this.options.textCommands[key];
            }
        }
    }

    toJSON() {
        var result = {
            "cats" : [],
            "logicState" : this.logicState,
            "captainTick" : this.captainTick,
            "captainForce" : this.captainForce,
            "voteRef" : this.voteRef.toJSON(),
            "gameRef" : this.gameRef != null ? this.gameRef.toJSON() : null,
            "gameCatRef" : this.gameCatRef != null ? this.gameCatRef.toJSON() : null
        };

        return result;
    }

    fromJSON(input) {

        ["logicState", "captainTick", "captainForce"].forEach((c) => {
            if (typeof input[c] != 'undefined') {
                this[c] = input[c];
            }
        });

        if (input["voteRef"]) {
            this.voteRef = VoteOperator.fromJSON(this, input["voteRef"]);
        }

        this.gameRef = input["gameRef"] ? Game.fromJSON(input["gameRef"]) : null;
        this.gameCatRef = input["gameCatRef"] ? Catalog.fromJSON(input["gameCatRef"]) : null;

        this.historyRef.fromJSON_history(input);

        if (this.gameRef == null) {
            this.logicState = 0;
        }

    }

    saveState() {
        var fs = require('fs');
        var jsonStr = JSON.stringify(this.toJSON(), null, 2);

        fs.writeFileSync("persistent.json", jsonStr);
        
        jsonStr = JSON.stringify(this.toJSON_conf(), null, 2);

        fs.writeFileSync("config_live.json", jsonStr);
        
        if (this.htmlPagePath) {

            var pRef = new PageView(this);
            pRef.doCompose();

        }
    }

    loadState() {
        var fs = require('fs'), data, dt;

        if (fs.existsSync("persistent.json") && (data = fs.readFileSync('persistent.json', 'utf8')) != false && (dt = JSON.parse(data))) {

            this.fromJSON(dt);

        }

        if (fs.existsSync("config_live.json") && (data = fs.readFileSync('config_live.json', 'utf8')) != false && (dt = JSON.parse(data))) {

            this.fromJSON_conf(dt);

        } else {

            this.fromJSON_conf({});

        }
    }

    nickChange(type, oldNick, newNick) {
        this.cats.forEach((catRef) => {

            catRef.nickChange(type, oldNick, newNick);

        });
    }

    userActivityEvent(partRef) {
        this.cats.forEach((catRef) => {

            let fndPartRef = catRef.getParticipantNickOrForceIndex(partRef.nick);

            if (fndPartRef) {
                fndPartRef.refreshTime();
            }

        });
    }

    joinEvent(cPartRef) {
        if (this.welcomeRef != null) {
            
            this.welcomeRef.sendWelcomeMessage(cPartRef);
        }
    }

    leaveEvent(partRef, reason) {
        if (reason) {
            this.supplyCommandAny(partRef, "lva " + reason, false);

        } else {
            this.supplyCommandAny(partRef, "lva", false);
        }
    }

    testBanned(cPartRef) {
        var dt = false;

        if (cPartRef.getAuthKey() && this.banUsers[cPartRef.getAuthKey()]) {
            dt = {
                'reason' : this.banUsers[cPartRef.getAuthKey()]['reason'],
                'time' : this.banUsers[cPartRef.getAuthKey()]['time'],
                'duration' : this.banUsers[cPartRef.getAuthKey()]['duration'],
                'by' : this.banUsers[cPartRef.getAuthKey()]['by'],
                'mask' : ''
            }

        } else if (cPartRef.type == 1) {
            var key, host = cPartRef.whois ? cPartRef.whois['host'] : '';

            if (!host) {
                host = '';
            }

            for (key in this.banUsers) {
                if (this.banUsers[key]['mask'] && Array.isArray(this.banUsers[key]['mask']) && this.banUsers[key]['mask'].length > 0) {
                    this.banUsers[key]['mask'].forEach((c) => {

                        var matches, regEx = new RegExp(c, 'i');

                        matches = regEx.exec(host);

                        if (matches) {
                            dt = {
                                'reason' : this.banUsers[key]['reason'],
                                'time' : this.banUsers[key]['time'],
                                'duration' : this.banUsers[key]['duration'],
                                'by' : this.banUsers[key]['by'],
                                'mask' : c
                            };
                        }

                    });
                }
            }
        }

        return dt;
    }

    getCatRef(flag) {
        if (flag) {
            var idx = 0;

            while (idx < this.cats.length) {
                if (this.cats[idx].flag == flag) {
                    return this.cats[idx];

                } else {
                    idx++;
                }
            }

        } else if (this.cats.length == 1) {
            return this.cats[0];
        }

        return null;
    }

    getCatRefByFlag(flag) {
        var idx = 0;

        while (idx < this.cats.length) {
            if (this.cats[idx].flag == flag) {
                return this.cats[idx];

            } else {
                idx++;
            }
        }

        return null;
    }

    deleteCatRef(flag) {
        var idx = 0;

        while (idx < this.cats.length) {
            if (this.cats[idx].flag == flag) {
                while (idx < this.cats.length - 1) {
                    this.cats[idx] = this.cats[idx + 1];
                    idx++;
                }

                this.cats.pop();
                idx = this.cats.length;
            }

            idx++;
        }
    }

    getCatRefByCreator(partRef) {
        var idx = 0;

        while (idx < this.cats.length) {
            if (this.cats[idx].creatorPartRef != null && this.cats[idx].creatorPartRef.compareEqual(partRef)) return this.cats[idx];
            else idx++;
        }

        return null;
    }

    getCmdAuth(cmd, flag = 'auth') {
        for (var key in this.cmds) {
            if (typeof this.cmds[key][flag] == 'undefined') {
                // none ...

            } else if (key == cmd) {
                return {
                    'result' : this.cmds[key][flag],
                    'exist' : true
                };

            } else if (this.cmds[key]['alt']) {
                var cRes = this.cmds[key]['alt'].some((cAlt) => {
                    return cAlt == cmd;
                });

                if (cRes) {
                    return {
                        'result' : this.cmds[key][flag],
                        'exist' : true
                    };
                }
            }
        }

        if (flag == 'auth') {
            if (this.textCommands[cmd]) {
                return {
                    'result' : 0,
                    'exist' : true
                };

            } else {
                return {
                    'result' : 10,
                    'exist' : false
                };
            }

        } else {
            return {
                'result' : false,
                'exist' : false
            };
        }
    }

    supplyCommand(partRef, text, privMsg) {

        text = text.trim();

        if (text.startsWith("!") || text.startsWith(".")) {

            text = text.substr(1);

            if (this.logicState == 0) {
                // filling the pug

                this.supplyCommandAny(partRef, text, privMsg);

            } else if (this.logicState == 1) {
                // picking captains

                this.supplyCommandAny(partRef, text, privMsg);

            } else if (this.logicState == 2) {
                // picking players

                this.supplyCommandAny(partRef, text, privMsg);

            }

        } // if
    }

    supplyCommandAny(partRef, text, privMsg) {

        let cStk = new CmdStack(this, text);

        partRef.getCompleted(this, (finPartRef) => {

            this.supplyCommandFn(finPartRef, cStk, privMsg);

        });
    }

    supplyCommandFn(partRef, cStk, privMsg) {

        let tt, cmdRef, wRef, bb, privPartRef = privMsg ? partRef : null;

        this.currentCmd = cStk.pop().toLowerCase();
        this.cStk = cStk;

        if (bb = this.testBanned(partRef)) {
            wRef = WordCo.cre();

            if (bb['duration'] == 0) {
                wRef.text('You are premanently banned by ').texth(bb['by'].nick).text(' for: ').texth(bb['reason']);

            } else {
                wRef.text('You are banned by ').texth(bb['by'].nick).text(' for: ').texth(bb['reason']);

                var rem;

                rem = bb['duration'] * 3600;
                rem -= ((new Date()).getTime() / 1000) - bb['time'];
                rem = Math.round((rem / 3600) * 10) / 10;

                wRef.text(' (remaining: ').texth(rem).text(' hours)');

                if (bb['mask']) {
                    wRef.text(' (mask: ').texth(bb['mask']).text(')');
                }
            }

            partRef.noticeMessage(this, wRef);
            return false;

        } else if ((tt = this.getCmdAuth(this.currentCmd)) && partRef.authLevel < tt['result']) {

            if (tt['exist']) {
                partRef.noticeMessage(this, WordCo.cre().text('Command ').texth(this.currentCmd).text(' is not allowed!'));
            }

            return false;

        } else if (privMsg && partRef.authLevel < 10 && (tt = this.getCmdAuth(this.currentCmd, 'allow_priv')) && !tt['result']) {

            if (tt['exist']) {
                partRef.noticeMessage(this, WordCo.cre().text('You are not allowed to send bot commands trought priv message!'));
            }

            return false;
        }

        this.partRef = partRef;
        this.privPartRef = privPartRef;

        var toFnd = this.currentCmd.toLowerCase();

        for (var cKey in this.cmds) {
            if (cKey == toFnd || (typeof this.cmds[cKey]['alt'] != 'undefined' && this.cmds[cKey]['alt'].indexOf(toFnd) >= 0)) {

                cmdRef = this.cmds[cKey]['inst'];
                cmdRef.exec();

                toFnd = false;

                break;
            }
        }

        if (toFnd) {
            if (this.textCommands[this.currentCmd] && Array.isArray(this.textCommands[this.currentCmd])) {
                this.textCommands[this.currentCmd].forEach((msg) => {
                    this.sendMsg(false, WordCo.cre().text(msg), privPartRef);
                });
            }
        }

        this.saveState();
    }

    startSelectCaptains(catRef, startSeconds) {
        // leave participants from other pugs

        this.cats.forEach((rCatRef) => {
            if (rCatRef.flag != catRef.flag) {
                rCatRef.leaveParticipantList(catRef.list);
            }
        });

        // create game reference

        this.gameRef = new Game(catRef, catRef.teamCount);
        this.gameCatRef = catRef;
        
        this.logicState = 1;
        this.captainTick = startSeconds ? startSeconds : 0;
        this.captainForce = false;
        this.captainForcePicked = false;

        this.saveState();

    }

    logicLoopTick() {
        if (this.logicLoopInt) {
            clearTimeout(this.logicLoopInt);
            this.logicLoopInt = null;
        }

        this.logicLoopInt = setTimeout(() => {

            this.logicLoop();

        }, 1000)
    }

    logicLoop() {
        if (this.botRef.isReady()) {

            let wRef, cTime = (new Date()).getTime() / 1000;

            this.welcomeRef.doEnable();

            this.botRef.channelDisUsers.refreshKnownUsers();

            // remove inactive players

            this.cats.forEach((catRef) => {

                let toKick = catRef.getParticipantsByStamp(this.playerInactivitySeconds);

                if (toKick.length > 0) {
                    toKick.forEach((partRef) => {

                        if (catRef.leaveParticipant(partRef) == 0) {

                            // msg to all
                            this.sendMsg(false, WordCo.cre().text('Player ').texth(partRef.nick).text(' removed from ').texth(catRef.flag).text(' pug for inactivity.'));

                        }

                    });
                }
            });

            // remove bans

            let authKey, toUnset = [];

            for (authKey in this.banUsers) {
                var c = this.banUsers[authKey];

                if (c["duration"] > 0 && (cTime - c["time"]) > c["duration"] * 3600) {
                    toUnset.push(authKey);
                }
            }

            if (toUnset.length > 0) {
                toUnset.forEach((authKey) => {
                    var c = this.banUsers[authKey];

                    wRef = WordCo.cre();
                    wRef.text('Player ').texth(c['partRef'] == null ? authKey : c['partRef'].nick).text(' was unbaned.');

                    if (c['reason']) {
                        wRef.text(' Ban reason: ').texth(c['reason']);
                    }

                    this.sendMsg(false, wRef);

                    delete this.banUsers[authKey];
                });

                this.saveState();
            }

            // remove inactive quickpugs

            var flagsRem = [];

            this.cats.forEach((catRef) => {
                if (catRef.isQuick && catRef.isEmpty() && (cTime - catRef.touchTime) > this.quickpugInactivitySeconds) {
                    flagsRem.push(catRef.flag);
                }
            });

            if (flagsRem.length > 0) {
                flagsRem.forEach((c) => {

                    this.deleteCatRef(c);

                    // msg to all
                    this.sendMsg(false, WordCo.cre().text('The ').texth(c).text(' pug was removed for inactivity.'));

                });

                this.saveState();
            }


            if (this.logicState == 0) {
                // joining ...

            } else if (this.logicState == 1) {
                // captain picking

                if (this.gameRef.teams.length == 0) {

                    this.sendMsg(false, WordCo.cre().text('The ').texth(this.gameRef.restCat.flag).text(' pug has been filled!'));
                    this.sendMsg(false, this.gameRef.restCat.addStatusReadable(WordCo.cre(), false, this.voteRef));
                    this.sendMsg(false, WordCo.cre().text('Pug is without teams so go server now please!'));

                    this.gameRef.getAllParticipants().forEach((cPartRef) => {

                        cPartRef.personalMessage(this, WordCo.cre().text('The ').texth(this.gameRef.restCat.flag).text(' pug has been filled! Go server now please!'), true);

                    });

                    this.gameHasFinished();

                    this.saveState();

                } else if (this.captainTick == 1) {
                    
                    this.sendMsg(false, WordCo.cre().text('The ').texth(this.gameRef.restCat.flag).text(' pug has been filled!'));
                    this.sendMsg(false, this.gameRef.restCat.addStatusReadable(WordCo.cre(), false, this.voteRef));

                    this.gameRef.getAllParticipants().forEach((cPartRef) => {

                        cPartRef.personalMessage(this, WordCo.cre().text('The ').texth(this.gameRef.restCat.flag).text(' pug has been filled! Please be prepared.'), true);

                    });

                } else if (!this.captainForce && this.captainTick == 2) {

                    this.sendMsg(false, WordCo.cre().text('Picking random captains in ').texth(this.captainPickSeconds).text(' seconds. Players tagged nocapt will be avoided. Type ').texth('!captain').text(' to become a captain. Use ').texth('!vote [player]').text(' to vote for your captain (you got ' + this.gameRef.teams.length + ' votes).'));

                } else if (!this.captainForce && this.captainPickSeconds - (this.captainTick - 2) == 5) {

                    if (this.voteRef == null) {
                        this.sendMsg(false, WordCo.cre().text('Random captains in ').texth('5').text(' seconds!'));

                    } else {
                        this.sendMsg(false, WordCo.cre().text('Captains will be picked in ').texth('5').text(' seconds!'));
                    }

                } else if (this.captainForce || this.captainPickSeconds - (this.captainTick - 2) <= 0) {
                    
                    this.gameRef.doPickCaptains(this.voteRef);

                    var teamRef;

                    if (!this.captainForcePicked) {

                        var idx = 0;

                        while (idx < this.gameRef.teams.length) {
                            teamRef = this.gameRef.teams[idx];

                            // channel notify
                            wRef = WordCo.cre();
                            wRef.text('Player');
                            teamRef.addTextFormatted(wRef, ' ' + teamRef.captPartRef.nick + ' ', false, true);
                            wRef.text('is captain for the ');
                            wRef.textDiscord(teamRef.getDiscordIcon());
                            teamRef.addTextFormatted(wRef, teamRef.colorName + ' Team');
                            wRef.text('.');

                            this.sendMsg(false, wRef);

                            // captain notify
                            wRef = WordCo.cre();

                            wRef.text('You are captain for ');
                            wRef.textDiscord(teamRef.getDiscordIcon());
                            teamRef.addTextFormatted(wRef, teamRef.colorName + ' Team');
                            wRef.text('.');

                            teamRef.captPartRef.personalMessage(this, wRef);

                            idx++;
                        }
                    }

                    teamRef = this.gameRef.getTeamByTurn();

                    wRef = WordCo.cre();
                    wRef.text('Captains have been picked. Captain');
                    teamRef.addTextFormatted(wRef, ' ' + teamRef.captPartRef.nick + ' ', false, true);
                    wRef.text('picks first. Captains type .here to prevent getting kicked.');

                    this.sendMsg(false, wRef);

                    this.logicState = 2;

                    this.saveState();

                    if (this.gameRef.restCat.isEmpty()) {
                        this.pickingHasFinished();
                    }

                }

                this.captainTick++;

            } else if (this.logicState == 2) {
                // player picking



            }

        }

        this.logicLoopTick();
    }

    pickingHasFinished() {
        if (this.logicState == 2) {

            // global msg

            let wRef;

            this.gameRef.teams.forEach((teamRef) => {
                wRef = WordCo.cre();
                teamRef.addStatusReadable(wRef);

                this.sendMsg(false, wRef);
            });

            this.sendMsg(false, WordCo.cre().text('Picking has finished.'));

            // notify participants

            this.gameRef.teams.forEach((teamRef) => {
                teamRef.catRef.list.forEach((cPartRef) => {

                    wRef = WordCo.cre();
                    wRef.text('Picking has finished. You are member of the ');
                    wRef.textDiscord(teamRef.getDiscordIcon());
                    teamRef.addTextFormatted(wRef, teamRef.colorName + ' Team');
                    wRef.text('. Go server now please!');

                    cPartRef.personalMessage(this, wRef, true);

                });
            });

            this.statsRef.saveGameToStats(this.gameRef);

            this.gameHasFinished();

            this.saveState();

        }
    }

    gameHasFinished() {

        if (this.logicState == 2 || this.logicState == 1) {

            this.gameRef.timeFinished = (new Date()).getTime() / 1000;

            var catRef;

            if ((catRef = this.getCatRef(this.gameRef.restCat.flag)) != null) {
                catRef.flushParticipants();

                if (catRef.isQuick) {
                    this.deleteCatRef(catRef.flag);
                }
            }

            this.historyRef.historyAddGame(this.gameRef);

            this.voteRef.clear();

            this.logicState = 0;
        }
    }

    getUser(nick, callback, preferType, force) {
        if (!nick) {
            callback(null);
            return false;
        }

        var subPartRef = null, idx, pref = false;

        if ((idx = nick.indexOf(":")) != -1) {
            pref = nick.substr(0, idx);

            nick = nick.substr(idx + 1);

            if (pref == 'irc') {
                subPartRef = this.botRef.channelIrcUsers.getUser(nick);

            } else if (pref == 'discord') {
                subPartRef = this.botRef.channelDisUsers.getUser(nick);
				
            } else if (pref == 'discord_id') {
				subPartRef = this.botRef.channelDisUsers.getUserId(nick);
			}

        } else if (typeof preferType != 'undefined' && preferType == 0) {
            // prefer discord

            subPartRef = this.botRef.channelDisUsers.getUser(nick);

            if (subPartRef != null && !subPartRef.isOnline()) {
                subPartRef = null;
            }

        } else if (typeof preferType != 'undefined' && preferType == 1) {
            // prefer irc

            subPartRef = this.botRef.channelIrcUsers.getUser(nick);

        }

        if (!pref && subPartRef == null) {
            if ((subPartRef = this.botRef.channelDisUsers.getUser(nick)) == null || !subPartRef.isOnline()) {

                subPartRef = this.botRef.channelIrcUsers.getUser(nick);

            }
        }

        if (subPartRef != null && (subPartRef.isOnline() || force)) {
            subPartRef.getCompleted(this, (cPartRef) => {

                callback(cPartRef);

            });

        } else {
            callback(null);
        }
    }

    sendMsg(channel, text, privPartRef = null) {
        if (privPartRef != null) {

            if (typeof text == 'object') {
                privPartRef.noticeMessage(this, text.getIrc());
            } else {
                privPartRef.noticeMessage(this, text);
            }

        } else if (typeof text == 'object') {

            this.botRef.sendExactToIRC(channel, text.getIrc());

            if (this.botRef.discord) {
                const msgStr = new discord.RichEmbed();

                msgStr.setDescription(text.getDiscord());
                msgStr.setColor([255, 0, 0]);
                msgStr.setTimestamp(new Date());

                this.botRef.sendExactToDiscord(channel, msgStr);
            }

        } else {
            this.botRef.sendExactToIRC(channel, text);

            if (this.botRef.discord) {
                const msgStr = new discord.RichEmbed();

                msgStr.setDescription(formatFromIRCToDiscord(text));
                msgStr.setColor([255, 0, 0]);
                msgStr.setTimestamp(new Date());

                this.botRef.sendExactToDiscord(channel, msgStr);
            }
        }
    }

    sendMsgArray(channel, list, idx, privPartRef = null) {
        if (privPartRef != null) {
            privPartRef.noticeMessage(this, list[idx].getIrc());

        } else {
            this.botRef.sendExactToIRC(channel, list[idx].getIrc());

            if (this.botRef.discord) {
                const msgStr = new discord.RichEmbed();

                msgStr.setDescription(list[idx].getDiscord());
                msgStr.setColor([255, 0, 0]);
                msgStr.setTimestamp(new Date());

                this.botRef.sendExactToDiscord(channel, msgStr);
            }
        }

        if (idx + 1 < list.length) {
            setTimeout(() => {
                this.sendMsgArray(channel, list, idx + 1, privPartRef);
            }, 1000);
        }
    }
}

export default Operator;
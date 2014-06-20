var currentPage = '#main';
var boardSize;
var computer;
var player;
var timeout = 500;
var strength = 0;
var game;
var board;
var userProfile;
var store;
var socket;
var roomId;
var roomInfo;
var socketOpt = {};
socketOpt['force new connection'] = true;

var loader = new PxLoader();

loader.addImage('img/w/p.png');
loader.addImage('img/w/n.png');
loader.addImage('img/w/b.png');
loader.addImage('img/w/r.png');
loader.addImage('img/w/q.png');
loader.addImage('img/w/k.png');
loader.addImage('img/b/p.png');
loader.addImage('img/b/n.png');
loader.addImage('img/b/b.png');
loader.addImage('img/b/r.png');
loader.addImage('img/b/q.png');
loader.addImage('img/b/k.png');

loader.addImage('img/w/tomove.png');
loader.addImage('img/b/tomove.png');


loader.addImage('img/highlightedsquare.png');

loader.addImage('img/boardreverse.png');

loader.start();

var squares = [
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
];

function numToChar(n) {
    return String.fromCharCode(97 + n);
}

function charToNum(c) {
    return c.charCodeAt(0)-97;
}

var fullnames = {
    'p': 'pawn',
    'n': 'knight',
    'b': 'bishop',
    'r': 'rook',
    'q': 'queen',
    'k': 'king'
};

var fullcolor = {
    'w': 'white',
    'b': 'black'
}

$(document).ready(function(){
    resizeBoard();
});

$(function(){
    addEvtForHistoryTab();
});

$(window).resize(resizeBoard);
$(window).bind('orientationchange', resizeBoard);

function resizeBoard() {
    var w = $(window).width();
    var h = $(window).height() - 70;

    boardSize = w>h? h : w;
    boardSize = boardSize>800? 800 : boardSize;
    //boardSize = boardSize<320? 320 : boardSize;
    boardSize -= 4;

    $('#board').width(boardSize);
    $('#board').height(boardSize);
}

var navigating = false;

function navigate(page, done, animate) {
    if (navigating) return;
    if (page == currentPage) return;
    navigating = true;

    if (currentPage) {
        dismiss(currentPage, function(){
            show(page, function(){
                navigating = false;
                if (done) {
                    return done();
                }
            }, animate);
        }, animate);
    } else {
        show(page, function(){
            navigating = false;
            if (done) {
                return done();
            }
        }, animate);
    }
}

function dismiss(page, done, animate) {
    currentPage = undefined;
    if (!animate) {
        $(page).removeClass();
        $(page).addClass('animated bounceOutDown');
        var wait = window.setTimeout( function(){
            $(page).removeClass();
            $(page).parent().parent().css('z-index', -10);
            $(page).addClass('hide');
            if (done) {
                return done();
            }
        }, 1300);
    } else {
        $(page).removeClass();
        $(page).parent().parent().css('z-index', -10);
        $(page).addClass('hide');
        if (done) {
            return done();
        }
    }
}

function show(page, done, animate) {
    currentPage = page;
    if (!animate) {
        $(page).removeClass();
        $(page).parent().parent().css('z-index', 100);
        $(page).addClass('animated bounceInDown');
        var wait = window.setTimeout( function(){
            $(page).removeClass();
            if (done) {
                return done();
            }
        }, 1300);
    } else {
        $(page).removeClass();
        $(page).parent().parent().css('z-index', 100);
        if (done) {
            return done();
        }
    }
}

function playWithComputer() {
    if (navigating) return;
    if (!navigator.onLine) return;

    var side = $("input:radio[name='side']:checked").val();
    var difficulty = $("input:radio[name='difficulty']:checked").val();
    console.log('SELECTED:'+side+','+difficulty);

    switch(side) {
    case 'w':
        computer = 'b';
        break;
    case 'b':
        computer = 'w';
        break;
    default:
        computer = Math.random()<0.5?'w':'b';
    }

    switch(difficulty) {
    case 'e':
        strength = 0;
        break;
    case 'm':
        strength = 50;
        break;
    case 'h':
        strength = 100;
        break;
    }

    player = undefined;

    setUpBoard();
    computerTurn();
}

function playWithFriend() {
    if (navigating) return;

    computer = undefined;
    player = undefined;
    setUpBoard();
}

function showBoard() {
    if ($('#board').hasClass('bounceInRight')) return;

    $('#board').removeClass();
    $('#board').addClass('animated bounceInRight');
    $('#board .board-bg').mousedown(function(){return false});
}

function dismissBoard(done) {
    if (socket) {
        socket.disconnect();
        socket = null;
        player = undefined;
        roomId = undefined;
    }
    disableMenu();

    if (!$('#board').hasClass('bounceOutLeft')) {
        $('#board').removeClass();
        $('#board').addClass('animated bounceOutLeft');
    }

    window.setTimeout(function() {
        if (done) {
            done();
        }
    }, 1000);
}

function disableMenu() {
    //$('.cog-menu').addClass('disabled');
    $('.suggest').addClass('disabled');
    $('.last').addClass('disabled');
    $('.undo').addClass('disabled');
    $('.rotate').addClass('disabled');
    $('.abandon').addClass('disabled');
    $('.swap').addClass('disabled');
    $('.difficulty').addClass('disabled');
    $('.save').addClass('disabled');
    $('.move-history').addClass('disabled');
}


function setUpBoard() {
    game = new Chess();
    $('#board').html('<img class="board-bg" src="img/board.png">');
    $('#board').append('<img class="indicator w" src="img/w/tomove.png">');

    $('#board').append('<img class="piece a1 w" src="img/w/r.png">');
    $('#board').append('<img class="piece b1 w" src="img/w/n.png">');
    $('#board').append('<img class="piece c1 w" src="img/w/b.png">');
    $('#board').append('<img class="piece d1 w" src="img/w/q.png">');
    $('#board').append('<img class="piece e1 w wking" src="img/w/k.png">');
    $('#board').append('<img class="piece f1 w" src="img/w/b.png">');
    $('#board').append('<img class="piece g1 w" src="img/w/n.png">');
    $('#board').append('<img class="piece h1 w" src="img/w/r.png">');

    $('#board').append('<img class="piece a2 w" src="img/w/p.png">');
    $('#board').append('<img class="piece b2 w" src="img/w/p.png">');
    $('#board').append('<img class="piece c2 w" src="img/w/p.png">');
    $('#board').append('<img class="piece d2 w" src="img/w/p.png">');
    $('#board').append('<img class="piece e2 w" src="img/w/p.png">');
    $('#board').append('<img class="piece f2 w" src="img/w/p.png">');
    $('#board').append('<img class="piece g2 w" src="img/w/p.png">');
    $('#board').append('<img class="piece h2 w" src="img/w/p.png">');

    $('#board').append('<img class="piece a7 b" src="img/b/p.png">');
    $('#board').append('<img class="piece b7 b" src="img/b/p.png">');
    $('#board').append('<img class="piece c7 b" src="img/b/p.png">');
    $('#board').append('<img class="piece d7 b" src="img/b/p.png">');
    $('#board').append('<img class="piece e7 b" src="img/b/p.png">');
    $('#board').append('<img class="piece f7 b" src="img/b/p.png">');
    $('#board').append('<img class="piece g7 b" src="img/b/p.png">');
    $('#board').append('<img class="piece h7 b" src="img/b/p.png">');

    $('#board').append('<img class="piece a8 b" src="img/b/r.png">');
    $('#board').append('<img class="piece b8 b" src="img/b/n.png">');
    $('#board').append('<img class="piece c8 b" src="img/b/b.png">');
    $('#board').append('<img class="piece d8 b" src="img/b/q.png">');
    $('#board').append('<img class="piece e8 b bking" src="img/b/k.png">');
    $('#board').append('<img class="piece f8 b" src="img/b/b.png">');
    $('#board').append('<img class="piece g8 b" src="img/b/n.png">');
    $('#board').append('<img class="piece h8 b" src="img/b/r.png">');

    squares.forEach(function(square){
        $('.piece.'+square).data('pos', square).click(handleSelect);
    });

    if (computer == 'w' || player == 'b') {
        $('.board-container-inner').addClass('rotated');
        $('.piece').addClass('rotated');
        $('.board-bg').attr('src', 'img/boardreverse.png');
    } else {
        $('.board-container-inner').removeClass('rotated');
        $('.piece').removeClass('rotated');
        $('.board-bg').attr('src', 'img/board.png');
    }

    updateCursor();

    $('.piece').draggable({
        helper: dragHelper,
        start: dragStart,
        stop: dragStop,
        zIndex: 1000
    });

    $('.save').removeClass('disabled')
    $('.suggest').removeClass('disabled');
    $('.rotate').removeClass('disabled');
    $('.abandon').removeClass('disabled');
    //$('.cog-menu').removeClass('disabled');

    if (computer) {
        $('.swap').removeClass('disabled');
        $('.difficulty').removeClass('disabled');
    }

    if (player) {
        $('.undo').addClass('disabled');
    }

    dismiss(currentPage, showBoard);
}

var validPromotions;
var deferredMove;
function handleMove(e) {
    var element = $(e.target);
    var from = element.data('from');
    var to = element.data('to');

    if (game.turn() != computer && validPromotions.length) {
        $('.promote-btn').addClass('hide');
        validPromotions.forEach(function(move){
            if (move.to != to) return;
            $('#promote-'+move.promotion).removeClass('hide');
        });
        navigate('#promote');
        deferredMove = {from:from, to:to};
        return;
    }

    move(from, to);

    endTurn();
    computerTurn();
}

function promote(piece) {
    dismiss(currentPage);

    var from = deferredMove.from;
    var to = deferredMove.to;

    move(from, to, piece);

    endTurn();
    computerTurn();
}

function move(from, to, promote, unanimate) {
    //always promote to queen unless told
    var promote = promote || 'q';
    var unanimate = unanimate || false;

    console.log('MOVE:' + to);
    $('.highlight').remove();

    var move;

    if (promote) {
        move = game.move({from:from, to:to, promotion:promote});
    } else {
        move = game.move({from:from, to:to});
    }
    if (move == null) {
        tryRecover();
        return;
    }

    if (socket) {
        socket.emit('move', {
            id: roomId,
            move: move
        });
    }

    if (!player) {
        $('.undo').removeClass('disabled');
    }
    $('.last').removeClass('disabled');
    $('.move-history').removeClass('disabled');
    if (move.flags.indexOf('c')!=-1) {
        $('.piece.'+to).remove();
    } else if (move.flags.indexOf('e')!=-1) {
        var enpassant;
        if (move.color == 'w') {
            enpassant = squares[squares.indexOf(to) - 8];
        } else {
            enpassant = squares[squares.indexOf(to) + 8];
        }
        $('.piece.'+enpassant).remove();
    } else if (move.flags.indexOf('k')!=-1) {
        if (move.color == 'w') {
            $('.piece.h1').removeClass('h1').addClass('f1').data('pos', 'f1');
        } else {
            $('.piece.h8').removeClass('h8').addClass('f8').data('pos', 'f8');
        }
    } else if (move.flags.indexOf('q')!=-1) {
        if (move.color == 'w') {
            $('.piece.a1').removeClass('a1').addClass('d1').data('pos', 'd1');
        } else {
            $('.piece.a8').removeClass('a8').addClass('d8').data('pos', 'd8');
        }
    }
    if (unanimate) {
        $('.piece.'+from).addClass('unanimate');
    }
    $('.piece.'+from).removeClass(from).removeClass('selected').addClass(to).data('pos', to);
    if (unanimate) {
        $('.piece.'+from).removeClass('unanimate');
    }

    if (move.flags.indexOf('p')!=-1) {
        $('.piece.'+to).attr('src','img/'+move.color+'/'+promote+'.png');
    }

    getHistory();
}

function computerTurn() {
	if (game.game_over()) return;

    if (game.turn() == computer) {
        var history = _.map(game.history({ verbose: true }), function(move){
            if (!move.promotion)
                return move.from + move.to;
            else
                return move.from + move.to + move.promotion;
        });
        console.log('HISTORY:'+history);

        /* TODO: REPLACEWITH COMPUTER TURN
        $.ajax({
            url:'/move',
            method:'POST',
            data:{
                history:history,
                strength:strength,
                timeout:timeout
            }
        }).done(function(data){
            console.log('CLOUD:'+data);
            var from = data.substring(0,2);
            var to = data.substring(2,4);
            var promote = data.substring(4,5);
            move(from, to, promote);
            endTurn();
        }).fail(function(){
            tryRecover();
        });
        */
    }
}

function endTurn() {
    $('.indicator').removeClass('w').removeClass('b').addClass(game.turn());
    $('.indicator').attr('src', 'img/'+game.turn()+'/tomove.png');

    if (game.in_check()) {
        console.log('CHECK');
        $('.'+game.turn()+'king').addClass('unanimate').effect('bounce', 'slow', function(){
             $('.'+game.turn()+'king').removeClass('unanimate');
        });
    }

    if (game.in_stalemate()) {
        console.log('STALEMATE');
        navigate('#stalemate');
    } else if (game.in_threefold_repetition()) {
        console.log('THREEFOLD')
        navigate('#threefold');
    } else if (game.insufficient_material()) {
        console.log('INSUFFICIENT')
        navigate('#material');
    } else if (game.in_draw()) {
        console.log('DRAW');
        navigate('#fifty');
    } else if (game.in_checkmate()) {
        console.log('CHECKMATE');
        navigate('#checkmate-'+fullcolor[game.turn()=='w'?'b':'w']);
    }

    updateCursor();

    /*if (game.game_over()) {
        disableMenu();
    }*/
}

function updateCursor() {
    if (computer) {
        var other = computer=='w'?'b':'w';
        $('.piece.'+other).removeClass('unselectable');
        $('.piece.'+computer).addClass('unselectable');
    } else if (player) {
        var other = game.turn()=='w'?'b':'w';
        if (game.turn() == player) {
            $('.piece.'+game.turn()).removeClass('unselectable');
        } else {
            $('.piece.'+game.turn()).addClass('unselectable');
        }
        $('.piece.'+other).addClass('unselectable');
    } else {
        var other = game.turn()=='w'?'b':'w';
        $('.piece.'+game.turn()).removeClass('unselectable');
        $('.piece.'+other).addClass('unselectable');
    }
}

function handleSelect(e) {
    var element = $(e.target);

    var pos = element.data('pos');
    var piece = game.get(pos);

    console.log('SELECTED:' + pos);

    if (piece.color != game.turn()) {
        $('.indicator').addClass('unanimate').effect('shake', {distance:15}, 'slow', function(){
             $('.indicator').removeClass('unanimate');
        });
        return;
    }
    if (game.turn() == computer) return;
    if (player && game.turn() != player) return;

    $('.piece.selected').removeClass('selected');
    element.addClass('selected');
    element.removeClass('unanimate');

    var moves =  _.uniq(_.pluck(game.moves({square:pos, verbose:true}), 'to'));
    validPromotions = _.filter(game.moves({square:pos, verbose:true}), function(move){
        return move.promotion;
    });

    console.log('MOVES:' + moves);

    $('.highlight').remove();
    moves.forEach(function(move){
        $('#board').append('<img class="highlight '+move+'" src="img/highlightedsquare.png">');
        $('.highlight.'+move).data('from', pos).data('to', move).click(handleMove);
    });

    if (moves.length == 0) {
        if (game.in_check()) {
            $('.'+game.turn()+'king').addClass('unanimate').effect('bounce', 'slow', function(){
                 $('.'+game.turn()+'king').removeClass('unanimate');
            });
        }
        $('.piece.selected').removeClass('selected');
    }
}

function dragStart(e) {
    var element = $(e.target);
    var pos = element.data('pos');
    var piece = game.get(pos);

    console.log('DRAGGING:' + pos);

    if (piece.color != game.turn()) {
        $('.indicator').addClass('unanimate').effect('shake', {distance:15}, 'slow', function(){
             $('.indicator').removeClass('unanimate');
        });
        e.preventDefault();
        return;
    }
    if (game.turn() == computer) return e.preventDefault();
    if (player && game.turn() != player) return e.preventDefault();

    $('.piece.selected').removeClass('selected');
    element.addClass('unanimate');
    element.addClass('fade');
    //element.addClass('selected');

    var moves = _.uniq(_.pluck(game.moves({square: pos, verbose: true}), 'to'));
    validPromotions = _.filter(game.moves({square:pos, verbose:true}), function(move){
        return move.promotion;
    });

    console.log('MOVES:' + moves);

    $('.highlight').remove();
    moves.forEach(function(move){
        $('#board').append('<img class="highlight '+move+'" src="img/highlightedsquare.png">');
        $('.highlight.'+move).data('from', pos).data('to', move).droppable({
            drop: handleMove
        });
    });

    if (moves.length == 0) {
        if (game.in_check()) {
            $('.'+game.turn()+'king').addClass('unanimate').effect('bounce', 'slow', function(){
                 $('.'+game.turn()+'king').removeClass('unanimate');
            });
        }
    }
}
function dragStop(e) {
    dragging = false;

    var element = $(e.target);;

    console.log('DRAGSTOPPED');

    element.removeClass('selected');
    element.removeAttr("style");
    element.removeClass('fade');
    $('.highlight').remove();
    $('#drag-layer').css('z-index', -10);
}

function dragHelper(e) {
    var element = $(e.target);
    $('#drag-layer').css('z-index', 100);
    var retVal = element.clone().addClass('unanimate').removeClass('rotated')
        .appendTo('#drag-layer').css('width', (boardSize/10))
        .css('height', (boardSize/10));
    return retVal;
}

var retries = 0;
function tryRecover() {
    if (player) return;

    if (retries > 3) {
        console.log('FATALERROR');
        navigate('#oops');
        return;
    }
    retries++;
    endTurn();
    computerTurn();
}

var abandonTo = '#main';
function abandon(page) {
    if ($('.abandon').hasClass('disabled')) return;
    abandonTo = page || '#main';
    navigate('#abandon-confirm');
}

function rotate() {
    if ($('.rotate').hasClass('disabled')) return;

    $('.board-container-inner').toggleClass('rotated');
    $('.piece').toggleClass('rotated');

    if ($('.board-container-inner').hasClass('rotated')) {
        $('.board-bg').attr('src', 'img/boardreverse.png');
    } else {
        $('.board-bg').attr('src', 'img/board.png');
    }
}

function last() {
    if ($('.last').hasClass('disabled')) return;

    var move = game.history({ verbose: true }).pop();
    $('.piece.'+move.to).addClass('unanimate').effect('bounce', 'slow', function(){
         $('.piece.'+move.to).removeClass('unanimate');
    });
}

function undo() {
    if ($('.undo').hasClass('disabled')) return;

    console.log('UNDO');
    if (computer) {
        singleUndo();
        if (game.turn() == computer) {
        	singleUndo();
        }
        endTurn();
    } else {
        singleUndo();
        endTurn();
    }

    var history = game.history();
    if (!history.length) {
        $('.undo').addClass('disabled');
        $('.last').addClass('disabled');
        $('.move-history').addClass('disabled');
    }

    if (currentPage) {
        dismiss(currentPage);
    }
}

function singleUndo() {
	console.log("SINGLEUNDO");
    var move = game.undo();
	if (!move) {
        $('.undo').addClass('disabled');
        $('.last').addClass('disabled');
        $('.move-history').addClass('disabled');
        return;
    }

    var from = move.from;
    var to = move.to;
    var captured = move.captured;
    var color = move.color;
    var other = color=='w'?'b':'w';

    $('.piece.'+to).removeClass(to).removeClass('selected')
        .removeClass('unanimate').addClass(from).data('pos', from);

    if (move.flags.indexOf('p')!=-1) {
        $('.piece.'+from).attr('src','img/'+move.color+'/p.png');
    }

    if (move.flags.indexOf('c')!=-1) {
        $('#board').append('<img class="piece '+to+' '+other+'" src="img/'+other+'/'+captured+'.png">');
        $('.piece.'+to).data('pos', to).click(handleSelect).draggable({
            helper: dragHelper,
            start: dragStart,
            stop: dragStop,
            zIndex: 1000
        });
        if ($('.board-container-inner').hasClass('rotated')) {
            $('.piece.'+to).addClass('rotated');
        }
    } else if (move.flags.indexOf('e')!=-1) {
        var enpassant;
        if (move.color == 'w') {
            enpassant = squares[squares.indexOf(to) - 8];
        } else {
            enpassant = squares[squares.indexOf(to) + 8];
        }
        $('#board').append('<img class="piece '+enpassant+' '+other+'" src="img/'+other+'/'+captured+'.png">');
        $('.piece.'+enpassant).data('pos', enpassant).click(handleSelect).draggable({
            helper: dragHelper,
            start: dragStart,
            stop: dragStop,
            zIndex: 1000
        });
        if ($('.board-container-inner').hasClass('rotated')) {
            $('.piece.'+enpassant).addClass('rotated');
        }
    } else if (move.flags.indexOf('k')!=-1) {
        if (move.color == 'w') {
            $('.piece.f1').removeClass('f1').addClass('h1').data('pos', 'h1');
        } else {
            $('.piece.f8').removeClass('f8').addClass('h8').data('pos', 'h8');
        }
    } else if (move.flags.indexOf('q')!=-1) {
        if (move.color == 'w') {
            $('.piece.d1').removeClass('d1').addClass('a1').data('pos', 'a1');
        } else {
            $('.piece.d8').removeClass('d8').addClass('a8').data('pos', 'a8');
        }
    }
}

function suggest() {
    if ($('.suggest').hasClass('disabled')) return;

    var history = _.map(game.history({ verbose: true }), function(move){
        if (!move.promotion)
            return move.from + move.to;
        else
            return move.from + move.to + move.promotion;
    });
    console.log('HISTORY:'+history);
    /*
    $.ajax({
        url:'/move',
        method:'POST',
        data:{
            history:history,
            strength:50,
            timeout:500
        }
    }).done(function(data){
        console.log('SUGGESTION:'+data);
        var from = data.substring(0,2);
        var to = data.substring(2,4);
        var promote = data.substring(4,5);

        $('.highlight').remove();
        $('.selected').removeClass('selected');
        $('.piece.'+from).off('click').removeClass(from)
            .removeClass('unanimate').addClass(to).addClass('suggestion');
        setTimeout(function() {
            $('.suggestion').removeClass(to).removeClass('selected')
                .removeClass('unanimate').addClass(from)
                .removeClass('suggestion').click(handleSelect);
        }, 500);
    });
    */
}

function swap() {
    if ($('.swap').hasClass('disabled')) return;

    if (computer == 'w' && $('.board-container-inner').hasClass('rotated') ||
        computer == 'b' && !$('.board-container-inner').hasClass('rotated')) {
        rotate();
    }

    setTimeout(function() {
        computer = computer=='w'?'b':'w';
        endTurn();
        computerTurn();
    }, 500);
}

function difficulty(setting) {
    if ($('.difficulty').hasClass('disabled')) return;

    if (!setting) {
        navigate('#difficulty-prompt');
        return;
    }

    switch(setting) {
    case 'e':
        strength = 0;
        break;
    case 'm':
        strength = 50;
        break;
    case 'h':
        strength = 100;
        break;
    }
    dismiss('#difficulty-prompt');
}

function home() {
    if (!$('#board').hasClass('bounceInRight')) {
        navigate('#main');
    } else {
        abandon('#main');
    }
}

function about() {
    if (!$('#board').hasClass('bounceInRight')) {
        navigate('#about');
    } else {
        abandon('#about');
    }
}

function updateBoardState(){
    var history = game.history({verbose:true});
    game = new Chess();
    for(var i=0;i<history.length;i++){
        move(history[i].from, history[i].to, history[i].promotion, true);
        endTurn();
    }
}

function loadPgn(pgn){
    if (!game) {
        game = new Chess();
    }
    game.load_pgn(pgn);
    updateBoardState();
}

function loadPrompt() {
    if ($('.load').hasClass('disabled')) return;

    /*if (navigator.onLine && userProfile) {
        $.ajax({
            url: '/save',
            method: 'GET'
        }).done(function(data) {
            var html = new EJS({ url: 'views/load-list.ejs' }).render({
                saves:data
            });
            $('#load-list').html(html);
            navigate('#load-prompt');
        });
    } else {
        var saves = JSON.parse(store.get('saves'));
        if (!saves) return;

        var html = new EJS({ url: 'views/load-list.ejs' }).render({
            saves:saves
        });
        $('#load-list').html(html);
        if (!navigator.onLine) {
            $('#load-list .ai-game').hide();
            $('#load-list').append($('<p>Games against cloud AI are not available offline.</p>'));
        }
        navigate('#load-prompt');
    }*/
}

function savePrompt() {
    if ($('.save').hasClass('disabled')) return;

    navigate('#save-prompt');
}

function save() {
    /*if (navigator.onLine && userProfile) {
        $.ajax({
            url: '/save',
            method: 'POST',
            data: {
                name: $('#save-name').val(),
                data: {
                    strength: strength,
                    computer: computer,
                    pgn: game.pgn()
                }
            }
        }).done(function(data){
            console.log('SAVE:'+data);
            dismiss(currentPage);
        }).fail(function(){
            console.log('ERROR');
        });
    } else {
        var saves = JSON.parse(store.get('saves'));
        if (!saves) {
            saves = [];
            next = 1;
        } else {
            next = _.max(_.pluck(saves, 'id'))+1;
        }
        saves.push({
            id: next,
            name: $('#save-name').val(),
            data: {
                strength: strength,
                computer: computer,
                pgn: game.pgn()
            },
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime()
        });
        store.set('saves', JSON.stringify(saves));
        console.log('SAVE');
        dismiss(currentPage);
    }*/
}


function addEvtForHistoryTab(){
    $(".move-history").on("click",function(){
        if($(this).hasClass('disabled'))
            return false;
        else
            getHistory();
    });
}

function createHistoryTable(history){
    var table = $("<table></table>");
    table.addClass("table table-striped table-condensed");
    var tableHeader = $("<thead><tr></tr></thead>");
    tableHeader.find('tr').append("<th>White</th>");
    tableHeader.find('tr').append("<th>Black</th>");
    var tableBody = $("<tbody></tbody>");

    for(var i=0;i<history.length;i+=2){
        var row = $("<tr></tr>");
        row.append("<td>" + history[i].san + "</td>");
        if(history[i+1] != undefined)
            row.append("<td>" + history[i+1].san + "</td>");
        else
            row.append("<td></td>");
        tableBody.append(row);
    }
    table.append(tableHeader).append(tableBody);
    return table;
}

function getHistory(){
    $("#history-view").children().remove();
    $("#history-view-mobile").children().remove();
    var history = game.history({verbose:true});
    var table = createHistoryTable(history);
    table.clone().appendTo("#history-view-mobile");
    table.clone().appendTo("#history-view");
    $("#history-view-mobile table").removeClass("table-striped");
}

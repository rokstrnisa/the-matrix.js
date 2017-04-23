// Copyright © 2017-present Rok Strniša, https://rok.strnisa.com/
//
// MIT License.

window.onload = matrixOnload;

function matrixOnload() {
    "use strict";

    // EASILY-CONFIGURABLE CONSTANTS
    var centerBoxTextFontSize = 32;
    var centerBoxTextColor = "#94FFB7";
    var centerBoxColor = centerBoxTextColor;
    var red = 95;
    var green = 185;
    var blue = 105;
    var highlightStrength = 100; // added to base colors above
    var highlightPointSpeed = 2;
    var highlightPointTailLength = 10;
    var numberOfHighlightPointsFactor = 1;
    var superColumnWidth = 10;
    var numberOfIterations = 30;
    var iterationSpeedInMs = 25;

    // OTHER CONSTANTS
    var centerBoxText = document.getElementById("tmjs-title").textContent.toLowerCase();
    var fontSize = 24; // also in CSS
    var columnWidth = fontSize + 2;
    var rowHeight = fontSize;
    var canvas = document.getElementById("canvas");
    var words = getWordsFromDom();
    var absDomSuperColumnOffsets = words.map(function (word) {
        return Math.abs(word.superColumnOffset)
    });
    var maxDomSuperColumnOffset = Math.max.apply(null, absDomSuperColumnOffsets);
    var minSuperColumnCount = Math.ceil(maxDomSuperColumnOffset * 2 + 1);
    var minColumnCount = minSuperColumnCount * superColumnWidth;
    var minViewWidth = minColumnCount * columnWidth;
    var absDomRowOffsets = words.map(function (word) {
        return Math.abs(word.rowOffset)
    });
    var maxDomRowOffset = Math.max.apply(null, absDomRowOffsets);
    var minRowCount = Math.ceil(maxDomRowOffset * 2);
    var minViewHeight = minRowCount * rowHeight;
    var highlightDiffPerRow = highlightStrength / highlightPointTailLength;

    // VARIABLE DECLARATIONS
    var viewWidth;
    var viewHeight;
    var letters;
    var highlights;
    var highlightPoints;
    var context;
    var columnCount;
    var rowCount;
    var centerRow;
    var superColumnCount;
    var centerSuperColumn;
    var firstRow;
    var iterationInterval;

    run();

    canvas.addEventListener("click", function () {
        if (firstRow === 0) {
            numberOfIterations = 1000;
            hideDom();
            run();
        } else {
            stop();
        }
    });

    window.addEventListener("resize", stop);

    function run() {
        reset();

        drawIteration();

        if (firstRow !== 0) {
            iterationInterval = window.setInterval(function () {
                --firstRow;

                drawIteration();

                if (firstRow === 0) {
                    clearInterval(iterationInterval);
                }
            }, iterationSpeedInMs);
        }
    }

    function stop() {
        clearInterval(iterationInterval);
        reset();
        firstRow = 0;
        drawIteration();
    }

    function getWordsFromDom() {
        var words = [];
        var domWords = document.getElementsByClassName("tmjs-word");
        for (var i = 0; i < domWords.length; ++i) {
            var domWord = domWords[i];
            var superColumnOffset = parseInt(domWord.getAttribute("data-tmjs-supercolumn-offset"));
            if (isNaN(superColumnOffset)) {
                console.error("ERROR (the-matrix.js): Attribute data-tmjs-supercolumn-offset of tmjs-word must be present and set to an integer. Skipping this word.");
                continue;
            }
            var rowOffset = parseInt(domWord.getAttribute("data-tmjs-row-offset"));
            if (isNaN(rowOffset)) {
                console.error("ERROR (the-matrix.js): Attribute data-tmjs-row-offset of tmjs-word must be present and set to an integer. Skipping this word.");
                continue;
            }
            var leftPadding = 0;
            if (domWord.hasAttribute("data-tmjs-left-padding")) {
                var leftPaddingInput = parseInt(domWord.getAttribute("data-tmjs-left-padding"));
                if (isNaN(leftPaddingInput)) {
                    console.error("ERROR (the-matrix.js): Attribute data-tmjs-left-padding of tmjs-word must be an integer. Using 0.");
                } else if (leftPaddingInput < 0) {
                    console.error("ERROR (the-matrix.js): Attribute data-tmjs-left-padding of tmjs-word must be a positive integer. Using 0.");
                } else {
                    leftPadding = leftPaddingInput;
                }
            }
            var text = domWord.textContent.toLowerCase();
            if (text.length == 0 || text.length + leftPadding > superColumnWidth - 1) {
                console.error("ERROR (the-matrix.js): Text must be non-empty and its length (with left padding) must fit within a column (width = " + superColumnWidth + "). Skipping this word.");
                continue;
            }
            var paddedText = Array(leftPadding + 1).join(".") + text + Array(superColumnWidth - text.length - leftPadding).join(".");
            words.push({
                element: domWord,
                paddedText: paddedText,
                superColumnOffset: superColumnOffset,
                rowOffset: rowOffset,
                leftPadding: leftPadding
            });
        }
        return words;
    }

    function reset() {
        viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0, minViewWidth);
        viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0, minViewHeight);
        canvas.setAttribute("width", viewWidth);
        canvas.setAttribute("height", viewHeight);
        context = canvas.getContext("2d");
        context.fillStyle = "rgb(" + red + ", " + green + ", " + blue + ")";
        context.font = fontSize + "px Courier New";
        context.textBaseline = "alphabetic";
        columnCount = Math.ceil(viewWidth / columnWidth);
        rowCount = Math.ceil(viewHeight / rowHeight);
        centerRow = Math.floor(rowCount / 2);
        superColumnCount = Math.floor(columnCount / superColumnWidth);
        centerSuperColumn = Math.floor(superColumnCount / 2);
        firstRow = endsWith(window.location.href, "?no-animation") ? 0 : numberOfIterations;

        letters = {};
        highlights = {};
        highlightPoints = [];

        for (var column = 0; column < columnCount; ++column) {
            if (column % superColumnWidth === 0) {
                continue;
            }
            letters[column] = {};
            highlights[column] = {};
            for (var row = 0; row < rowCount + firstRow; ++row) {
                letters[column][row] = Math.floor(Math.random() * 10);
                highlights[column][row] = 0;
            }
        }

        var numberOfHighlightPoints = numberOfHighlightPointsFactor * (columnCount / 2 + 2 * firstRow);
        for (var i = 0; i < numberOfHighlightPoints; ++i) {
            var highlightPointColumn = Math.floor(Math.random() * columnCount);
            if (highlightPointColumn % superColumnWidth === 0) {
                continue;
            }
            var highlightTotalHeight = (rowCount + firstRow) * 2;
            var highlightPointRow = rowCount - Math.floor(Math.random() * highlightTotalHeight);
            var highlightPoint = [highlightPointColumn, highlightPointRow];
            highlightPoints = highlightPoints.concat([highlightPoint]);
        }

        for (var i = 0; i < words.length; ++i) {
            setDomLetters(words[i]);
        }
    }

    function setDomLetters(word) {
        var superColumn = centerSuperColumn + word.superColumnOffset;
        var row = centerRow + word.rowOffset;
        for (var i = 0; i < word.paddedText.length; ++i) {
            var column = 1 + superColumn * superColumnWidth + i;
            letters[column][row] = word.paddedText.charAt(i);
        }
    }

    function drawIteration() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        // calculate highlights
        for (var column = 0; column < columnCount; ++column) {
            if (column % superColumnWidth === 0) {
                continue;
            }
            for (var row = 0; row < rowCount + firstRow; ++row) {
                highlights[column][row] = 0;
            }
        }
        for (var i = 0; i < highlightPoints.length; ++i) {
            var highlightPoint = highlightPoints[i];
            var highlightPointColumn = highlightPoint[0];
            var highlightPointRow = highlightPoint[1];
            for (var distance = 0; distance < highlightPointTailLength; ++distance) {
                highlights[highlightPointColumn][highlightPointRow - distance] = highlightStrength - highlightDiffPerRow * distance;
            }
            highlightPoints[i] = [highlightPointColumn, highlightPointRow + highlightPointSpeed];
        }

        // draw current letters.
        for (var column = 0; column < columnCount; ++column) {
            if (column % superColumnWidth === 0) {
                continue;
            }
            for (var row = 0; row < rowCount; ++row) {
                var letter = letters[column][firstRow + row];
                if (firstRow === 0 && letter !== '.' && typeof letter === "string") {
                    continue;
                }
                var highlight = highlights[column][row];
                context.fillStyle = "rgb(" + (red + highlight) + ", " + (green + highlight) + ", " + (blue + highlight) + ")";
                context.fillText(letter, column * columnWidth, (row + 1) * rowHeight);
            }
        }

        if (firstRow === 0) {
            onStop();
        }
    }

    function onStop() {
        drawTitle();
        placeDom();
    }

    function drawTitle() {
        context.save();
        context.font = centerBoxTextFontSize + "px Courier New";
        context.shadowColor = centerBoxColor;
        context.shadowBlur = 100;
        var textWidth = context.measureText(centerBoxText).width;
        var centerX = viewWidth / 2;
        var centerY = viewHeight / 2;
        var rectWidth = textWidth + 30;
        var rectHeight = centerBoxTextFontSize + 12;
        var rectX = centerX - rectWidth / 2;
        var rectY = centerY - rectHeight / 2;

        context.fillStyle = "black";
        context.fillRect(rectX, rectY, rectWidth, rectHeight);
        context.strokeStyle = centerBoxColor;
        context.lineWidth = 3;
        context.strokeRect(rectX, rectY, rectWidth, rectHeight);

        context.fillStyle = centerBoxTextColor;
        context.textBaseline = "middle";
        context.textAlign = "center";
        context.fillText(centerBoxText, centerX, centerY);
        context.restore();
    }

    function placeDom() {
        var canvasBoundingRect = canvas.getBoundingClientRect();
        for (var i = 0; i < words.length; ++i) {
            var word = words[i];
            var superColumn = centerSuperColumn + word.superColumnOffset;
            var column = (word.leftPadding + 1) + (superColumn * superColumnWidth);
            var row = centerRow + word.rowOffset;
            word.element.style.left = (canvasBoundingRect.left + column * columnWidth) + "px";
            word.element.style.top = (canvasBoundingRect.top + row * rowHeight) + "px";
            word.element.style.display = "inline";
        }
    }

    function hideDom() {
        for (var i = 0; i < words.length; ++i) {
            var word = words[i];
            word.element.style.display = "none";
        }
    }

    function endsWith(string, suffix) {
        return string.indexOf(suffix, string.length - suffix.length) !== -1;
    }
}

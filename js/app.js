document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
     DOM ELEMENTS
     ===================================================== */

    const canvas =
            document.getElementById("mandelbrotCanvas");
    const renderButton =
            document.getElementById("renderButton");

    const stopButton =
            document.getElementById("stopButton");

    const resetButton =
            document.getElementById("resetButton");

    const downloadButton =
            document.getElementById("downloadButton");


    const centerXInput =
            document.getElementById("centerX");

    const centerYInput =
            document.getElementById("centerY");

    const magnificationInput =
            document.getElementById("magnification");

    const maxIterationsInput =
            document.getElementById("maxIterations");

    const bailoutInput =
            document.getElementById("bailout");

    const gradientMultiplierInput =
            document.getElementById("gradientMultiplier");


    const smoothColouringInput =
            document.getElementById("smoothColouring");

    const optimisationsInput =
            document.getElementById("optimisations");


    const renderState =
            document.getElementById("renderState");

    const renderOverlay =
            document.getElementById("renderOverlay");

    const progressBar =
            document.getElementById("renderProgressBar");


    const magnificationDisplay =
            document.getElementById("magnificationDisplay");

    const iterationDisplay =
            document.getElementById("iterationDisplay");

    const renderPassDisplay =
            document.getElementById("renderPassDisplay");

    const renderTimeDisplay =
            document.getElementById("renderTimeDisplay");


    /* =====================================================
     VALIDATE ESSENTIAL HTML
     ===================================================== */

    if (!canvas) {
        throw new Error(
                "Mandelbrot canvas was not found."
                );
    }

    if (!gradientMultiplierInput) {
        throw new Error(
                "Gradient multiplier input was not found."
                );
    }


    /* =====================================================
     GRADIENT
     ===================================================== */

    const gradient =
            SmoothGradient.createDefault();

    const gradientEditor =
            new GradientEditor();


    /* =====================================================
     CANVAS
     ===================================================== */

    const canvasRenderer =
            new CanvasRenderer(
                    "mandelbrotCanvas"
                    );


    /* =====================================================
     COORDINATE MAPPER
     ===================================================== */

    const coordinateMapper =
            new CoordinateMapper(
                    canvas.width,
                    canvas.height,
                    centerXInput.value,
                    centerYInput.value,
                    magnificationInput.value
                    );


    /* =====================================================
     PROGRESSIVE RENDERER
     ===================================================== */

    const progressiveRenderer =
            new ProgressiveRenderer(
                    canvasRenderer,
                    coordinateMapper,
                    gradient
                    );

    progressiveRenderer
            .setFrameBudget(10);


    /* =====================================================
     INITIAL GRADIENT
     ===================================================== */

    updateGradientFromEditor();

    applyGradientMultiplier();


    /* =====================================================
     DRAG ZOOM STATE
     ===================================================== */

    let dragging = false;

    let dragStartX = 0;
    let dragStartY = 0;

    let currentSelection = null;

    const MINIMUM_ZOOM_SIZE = 5;


    /* =====================================================
     RENDER BUTTON
     ===================================================== */

    renderButton.addEventListener(
            "click",
            () => {

        startRenderFromInputs();
    }
    );


    /* =====================================================
     STOP BUTTON
     ===================================================== */

    stopButton.addEventListener(
            "click",
            () => {

        progressiveRenderer.stop();
    }
    );


    /* =====================================================
     RESET BUTTON
     ===================================================== */

    resetButton.addEventListener(
            "click",
            () => {

        progressiveRenderer.stop();

        coordinateMapper.reset();

        updateInputsFromMapper();

        startRender();
    }
    );


    /* =====================================================
     DOWNLOAD BUTTON
     ===================================================== */

    downloadButton.addEventListener(
            "click",
            () => {

        canvasRenderer.download(
                "mandelbrot.png"
                );
    }
    );


    /* =====================================================
     ENTER KEY ON NUMERIC CONTROLS
     ===================================================== */

    const renderInputs = [
        centerXInput,
        centerYInput,
        magnificationInput,
        maxIterationsInput,
        bailoutInput,
        gradientMultiplierInput
    ];

    for (const input of renderInputs) {

        input.addEventListener(
                "keydown",
                event => {

                    if (event.key === "Enter") {

                        event.preventDefault();
                        startRenderFromInputs();
                    }
                }
        );
    }


    /* =====================================================
     SMOOTH COLOURING
     ===================================================== */

    smoothColouringInput.addEventListener(
            "change",
            () => {

        progressiveRenderer
                .setSmoothColouring(
                        smoothColouringInput.checked
                        );

        /*
         * Smooth colouring changes the stored
         * escape values, so this requires a new
         * Mandelbrot calculation.
         */

        startRenderFromInputs();
    }
    );


    /* =====================================================
     OPTIMISATIONS
     ===================================================== */

    optimisationsInput.addEventListener(
            "change",
            () => {

        progressiveRenderer
                .setOptimisations(
                        optimisationsInput.checked
                        );

        startRenderFromInputs();
    }
    );


    /* =====================================================
     GRADIENT EDITOR
     ===================================================== */

    gradientEditor
            .setGradientChangedListener(
                    stops => {

                        updateGradient(stops);

                        /*
                         * Changing gradient colours does not
                         * alter Mandelbrot calculations.
                         */

                        progressiveRenderer
                                .recolour();
                    }
            );


    /* =====================================================
     GRADIENT MULTIPLIER
     ===================================================== */

    gradientMultiplierInput.addEventListener(
            "input",
            () => {

        const value =
                getGradientMultiplier();

        if (value === null) {
            return;
        }


        progressiveRenderer
                .setGradientMultiplier(
                        value
                        );


        /*
         * IMPORTANT:
         *
         * The final displayed image uses 3x3
         * supersampling.
         *
         * recolour() only has the stored centre
         * sample for each pixel. The eight extra
         * subpixel samples are not stored.
         *
         * Therefore recolour() would destroy the
         * anti-aliased result.
         *
         * Perform a fresh render so the new
         * multiplier is applied to all nine
         * samples.
         */
        startRenderFromInputs();
    }
    );


    /* =====================================================
     MOUSE ZOOM - START
     ===================================================== */

    canvas.addEventListener(
            "mousedown",
            event => {

                if (event.button !== 0) {
                    return;
                }

                event.preventDefault();

                const position =
                        canvasRenderer
                        .eventToCanvasPosition(
                                event
                                );

                dragging = true;

                dragStartX =
                        position.x;

                dragStartY =
                        position.y;

                currentSelection = {

                    startX:
                            dragStartX,

                    startY:
                            dragStartY,

                    endX:
                            dragStartX,

                    endY:
                            dragStartY,

                    x:
                            dragStartX,

                    y:
                            dragStartY,

                    width:
                            0,

                    height:
                            0
                };

                canvas.style.cursor =
                        "crosshair";
            }
    );


    /* =====================================================
     MOUSE ZOOM - MOVE
     ===================================================== */

    document.addEventListener(
            "mousemove",
            event => {

                if (!dragging) {
                    return;
                }

                const position =
                        canvasRenderer
                        .eventToCanvasPosition(
                                event
                                );

                const rectangle =
                        coordinateMapper
                        .constrainRectangle(
                                dragStartX,
                                dragStartY,
                                position.x,
                                position.y
                                );

                currentSelection =
                        rectangle;

                canvasRenderer
                        .setSelection(
                                rectangle.x,
                                rectangle.y,
                                rectangle.width,
                                rectangle.height
                                );
            }
    );


    /* =====================================================
     MOUSE ZOOM - RELEASE
     ===================================================== */

    document.addEventListener(
            "mouseup",
            event => {

                if (!dragging) {
                    return;
                }

                if (event.button !== 0) {
                    return;
                }

                dragging = false;

                canvasRenderer
                        .clearSelection();

                if (!currentSelection) {
                    return;
                }

                const width =
                        currentSelection.width;

                const height =
                        currentSelection.height;

                if (
                        width < MINIMUM_ZOOM_SIZE ||
                        height < MINIMUM_ZOOM_SIZE
                        ) {

                    currentSelection = null;

                    return;
                }

                progressiveRenderer.stop();

                coordinateMapper
                        .zoomToRectangle(
                                currentSelection.startX,
                                currentSelection.startY,
                                currentSelection.endX,
                                currentSelection.endY
                                );

                currentSelection = null;

                updateInputsFromMapper();

                /*
                 * startRender() reads the current
                 * gradient multiplier before rendering.
                 */

                startRender();
            }
    );


    document.getElementById('zoomOutButton').addEventListener('click', () => {
        progressiveRenderer.stop();
        coordinateMapper.zoomOutAtPixel(canvas.width / 2, canvas.height / 2, 2);
        updateInputsFromMapper();
        startRender();
    });
    document.getElementById('canvasResetButton').addEventListener('click', () => resetButton.click());

    /* =====================================================
     RIGHT CLICK - ZOOM OUT
     ===================================================== */

    canvas.addEventListener(
            "contextmenu",
            event => {

                event.preventDefault();

                progressiveRenderer.stop();

                const position =
                        canvasRenderer
                        .eventToCanvasPosition(
                                event
                                );

                coordinateMapper
                        .zoomOutAtPixel(
                                position.x,
                                position.y,
                                2
                                );

                updateInputsFromMapper();

                startRender();
            }
    );


    /* =====================================================
     PREVENT BROWSER IMAGE DRAGGING
     ===================================================== */

    canvas.addEventListener(
            "dragstart",
            event => {

                event.preventDefault();
            }
    );


    /* =====================================================
     RENDERER CALLBACKS
     ===================================================== */

    progressiveRenderer
            .setPassStartListener(
                    (
                            blockSize,
                            passIndex,
                            passCount
                            ) => {

                setRenderState(
                        "Rendering"
                        );

                setOverlayText(
                        `${blockSize}×${blockSize}`
                        );

                if (renderPassDisplay) {

                    renderPassDisplay.textContent =
                            `${blockSize}×${blockSize}`;
                }

                updatePassIndicators(
                        blockSize
                        );
            }
            );


    progressiveRenderer
            .setPassCompleteListener(
                    blockSize => {

                        updatePassIndicators(
                                blockSize,
                                true
                                );
                    }
            );


    progressiveRenderer
            .setProgressListener(
                    (
                            progress,
                            calculated,
                            total
                            ) => {

                const percentage =
                        progress * 100;

                setProgress(
                        percentage
                        );

                updateElapsedTime();

                if (renderOverlay) {

                    renderOverlay.title =
                            `${calculated.toLocaleString()} / ` +
                            `${total.toLocaleString()} calculated`;
                }
            }
            );


    progressiveRenderer
            .setCompleteListener(
                    result => {

                        setRenderState(
                                "Complete"
                                );

                        setOverlayText(
                                ""
                                );

                        setProgress(
                                100
                                );

                        if (renderPassDisplay) {

                            renderPassDisplay.textContent =
                                    "1×1 Final";
                        }

                        if (renderTimeDisplay) {

                            renderTimeDisplay.textContent =
                                    formatTime(
                                            result.elapsedMilliseconds
                                            );
                        }

                        setControlsRendering(
                                false
                                );
                    }
            );


    progressiveRenderer
            .setStopListener(
                    result => {

                        setRenderState(
                                "Stopped"
                                );

                        setOverlayText(
                                ""
                                );

                        if (renderTimeDisplay) {

                            renderTimeDisplay.textContent =
                                    formatTime(
                                            result.elapsedMilliseconds
                                            );
                        }

                        setControlsRendering(
                                false
                                );
                    }
            );


    /* =====================================================
     START RENDER FROM HTML INPUTS
     ===================================================== */

    function startRenderFromInputs() {

        try {

            /*
             * Keep these as strings.
             *
             * CoordinateMapper converts them directly
             * into DoubleDouble values.
             */

            const centerX =
                    centerXInput.value.trim();

            const centerY =
                    centerYInput.value.trim();

            const magnification =
                    magnificationInput.value.trim();

            coordinateMapper.setView(
                    centerX,
                    centerY,
                    magnification
                    );

            startRender();

        } catch (error) {

            console.error(error);

            setRenderState(
                    "Invalid input"
                    );

            setOverlayText(
                    "Check coordinates"
                    );
        }
    }


    /* =====================================================
     START ACTUAL RENDER
     ===================================================== */

    function startRender() {

        try {

            progressiveRenderer.stop();


            const maxIterations =
                    Number.parseInt(
                            maxIterationsInput.value,
                            10
                            );

            const bailout =
                    Number(
                            bailoutInput.value
                            );

            const gradientMultiplier =
                    getGradientMultiplier();


            /* -------------------------
             Validate
             ------------------------- */

            if (
                    !Number.isFinite(maxIterations) ||
                    maxIterations < 1
                    ) {

                throw new RangeError(
                        "Maximum iterations must be positive."
                        );
            }

            if (
                    !Number.isFinite(bailout) ||
                    bailout <= 0
                    ) {

                throw new RangeError(
                        "Bailout must be positive."
                        );
            }

            if (gradientMultiplier === null) {

                throw new RangeError(
                        "Gradient multiplier must be positive."
                        );
            }


            /* -------------------------
             Apply current settings
             ------------------------- */

            progressiveRenderer
                    .setMaxIterations(
                            maxIterations
                            );

            progressiveRenderer
                    .setBailout(
                            bailout
                            );

            progressiveRenderer
                    .setGradientMultiplier(
                            gradientMultiplier
                            );

            progressiveRenderer
                    .setSmoothColouring(
                            smoothColouringInput.checked
                            );

            progressiveRenderer
                    .setOptimisations(
                            optimisationsInput.checked
                            );


            /* -------------------------
             Reset render UI
             ------------------------- */

            setProgress(
                    0
                    );

            setRenderState(
                    "Rendering"
                    );

            setControlsRendering(
                    true
                    );

            if (iterationDisplay) {

                iterationDisplay.textContent =
                        maxIterations
                        .toLocaleString();
            }

            if (renderTimeDisplay) {

                renderTimeDisplay.textContent =
                        "0 ms";
            }

            updateMagnificationDisplay();


            /* -------------------------
             Render
             ------------------------- */

            progressiveRenderer
                    .render()
                    .catch(error => {

                        console.error(
                                "Mandelbrot rendering failed:",
                                error
                                );

                        setRenderState(
                                "Error"
                                );

                        setOverlayText(
                                "Render error"
                                );

                        setControlsRendering(
                                false
                                );
                    });

        } catch (error) {

            console.error(error);

            setRenderState(
                    "Invalid input"
                    );

            setOverlayText(
                    "Check settings"
                    );

            setControlsRendering(
                    false
                    );
        }
    }


    /* =====================================================
     GRADIENT MULTIPLIER HELPERS
     ===================================================== */

    function getGradientMultiplier() {

        const value =
                Number(
                        gradientMultiplierInput.value
                        );

        if (
                !Number.isFinite(value) ||
                value <= 0
                ) {

            return null;
        }

        return value;
    }


    function applyGradientMultiplier() {

        const value =
                getGradientMultiplier();

        if (value === null) {
            return;
        }

        progressiveRenderer
                .setGradientMultiplier(
                        value
                        );
    }


    /* =====================================================
     GRADIENT SYNCHRONISATION
     ===================================================== */

    function updateGradientFromEditor() {

        const stops =
                gradientEditor.getStops();

        updateGradient(
                stops
                );
    }


    function updateGradient(stops) {

        const entries =
                stops.map(
                        stop => {

                            return new GradientEntry(
                                    stop.position,
                                    stop.colour
                                    );
                        }
                );

        gradient.setEntries(
                entries
                );

        /*
         * Build the colour lookup table once.
         */

        gradient.buildLookupTable(
                4096
                );
    }


    /* =====================================================
     UPDATE INPUTS FROM COORDINATE MAPPER
     ===================================================== */

    function updateInputsFromMapper() {

        centerXInput.value =
                formatDoubleDoubleForInput(
                        coordinateMapper
                        .getCenterX()
                        );

        centerYInput.value =
                formatDoubleDoubleForInput(
                        coordinateMapper
                        .getCenterY()
                        );

        magnificationInput.value =
                formatDoubleDoubleForInput(
                        coordinateMapper
                        .getMagnification()
                        );

        updateMagnificationDisplay();
    }


    /* =====================================================
     DOUBLEDOUBLE DISPLAY FORMATTING
     ===================================================== */

    function formatDoubleDoubleForInput(
            value
            ) {

        const number =
                value.toNumber();

        if (!Number.isFinite(number)) {

            return value.toString();
        }

        return number.toPrecision(17);
    }


    /* =====================================================
     MAGNIFICATION DISPLAY
     ===================================================== */

    function updateMagnificationDisplay() {

        if (!magnificationDisplay) {
            return;
        }

        const magnification =
                coordinateMapper
                .getMagnification()
                .toNumber();

        if (!Number.isFinite(magnification)) {

            magnificationDisplay.textContent =
                    coordinateMapper
                    .getMagnification()
                    .toString();

            return;
        }

        if (magnification >= 1000000) {

            magnificationDisplay.textContent =
                    magnification
                    .toExponential(3) +
                    "×";

        } else {

            magnificationDisplay.textContent =
                    magnification
                    .toLocaleString(
                            undefined,
                            {
                                maximumFractionDigits:
                                        3
                            }
                    ) +
                    "×";
        }
    }


    /* =====================================================
     RENDER STATE
     ===================================================== */

    function setRenderState(text) {

        if (renderState) {

            renderState.textContent =
                    text;
        }
    }


    /* =====================================================
     OVERLAY
     ===================================================== */

    function setOverlayText(text) {

        if (!renderOverlay) {
            return;
        }

        renderOverlay.textContent =
                text;

        if (text) {

            renderOverlay.classList.add(
                    "visible"
                    );

        } else {

            renderOverlay.classList.remove(
                    "visible"
                    );
        }
    }


    /* =====================================================
     PROGRESS BAR
     ===================================================== */

    function setProgress(
            percentage
            ) {

        if (!progressBar) {
            return;
        }

        percentage =
                Math.max(
                        0,
                        Math.min(
                                100,
                                percentage
                                )
                        );

        progressBar.style.width =
                `${percentage}%`;

        progressBar.setAttribute(
                "aria-valuenow",
                percentage.toFixed(1)
                );
    }


    /* =====================================================
     RENDER CONTROL STATES
     ===================================================== */

    function setControlsRendering(
            rendering
            ) {

        if (renderButton) {

            renderButton.disabled =
                    rendering;
        }

        if (stopButton) {

            stopButton.disabled =
                    !rendering;
        }
    }


    /* =====================================================
     PROGRESSIVE PASS INDICATORS
     ===================================================== */

    function updatePassIndicators(
            blockSize,
            completed = false
            ) {

        const elements =
                document.querySelectorAll(
                        "[data-block-size]"
                        );

        for (const element of elements) {

            const size =
                    Number(
                            element.dataset.blockSize
                            );
            element.classList.remove(
                    "active",
                    "complete"
                    );

            if (size > blockSize) {

                element.classList.add(
                        "complete"
                        );
            }

            if (size === blockSize) {

                element.classList.add(
                        completed
                        ? "complete"
                        : "active"
                        );
            }
    }
    }


    /* =====================================================
     ELAPSED RENDER TIME
     ===================================================== */

    function updateElapsedTime() {

        if (!renderTimeDisplay) {
            return;
        }

        if (
                !progressiveRenderer.isRunning()
                ) {

            return;
        }

        const elapsed =
                performance.now() -
                progressiveRenderer.renderStartTime;

        renderTimeDisplay.textContent =
                formatTime(
                        elapsed
                        );
    }


    function formatTime(
            milliseconds
            ) {

        if (milliseconds < 1000) {

            return (
                    Math.round(milliseconds) +
                    " ms"
                    );
        }

        if (milliseconds < 60000) {

            return (
                    (
                            milliseconds /
                            1000
                            ).toFixed(2) +
                    " s"
                    );
        }

        const totalSeconds =
                milliseconds /
                1000;

        const minutes =
                Math.floor(
                        totalSeconds /
                        60
                        );

        const seconds =
                totalSeconds -
                minutes * 60;

        return (
                `${minutes}m ` +
                `${seconds.toFixed(1)}s`
                );
    }


    /* =====================================================
     INITIAL UI
     ===================================================== */

    function initialiseUI() {

        setControlsRendering(
                false
                );

        setProgress(
                0
                );

        setRenderState(
                "Ready"
                );

        setOverlayText(
                ""
                );

        if (iterationDisplay) {

            iterationDisplay.textContent =
                    maxIterationsInput.value;
        }

        if (renderPassDisplay) {

            renderPassDisplay.textContent =
                    "—";
        }

        if (renderTimeDisplay) {

            renderTimeDisplay.textContent =
                    "—";
        }

        updateMagnificationDisplay();

        canvas.style.cursor =
                "crosshair";
    }


    /* =====================================================
     START APPLICATION
     ===================================================== */

    initialiseUI();

    startRender();

});
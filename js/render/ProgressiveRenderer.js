class ProgressiveRenderer {

    constructor(
        canvasRenderer,
        coordinateMapper,
        gradient
    ) {

        this.canvasRenderer = canvasRenderer;
        this.coordinateMapper = coordinateMapper;
        this.gradient = gradient;


        /*
         * Progressive rendering:
         *
         * 8x8 -> 4x4 -> 2x2 -> 1x1
         *
         * Then:
         *
         * 3x3 subpixel supersampling
         */
        this.passes = [
            8,
            4,
            2,
            1
        ];


        this.frameBudget = 10;

        this.renderGeneration = 0;
        this.running = false;


        /*
         * Mandelbrot settings.
         */
        this.maxIterations = 500;
        this.bailout = 4.0;

        this.smoothColouring = true;
        this.optimisations = true;


        /*
         * Colour cycling.
         */
        this.gradientMultiplier = 12.0;


        /*
         * 3x3 anti-aliasing.
         */
        this.antiAliasing = true;

        this.subPixelOffset =
            1.0 / 3.0;


        /*
         * Callbacks.
         */
        this.onPassStart = null;
        this.onPassComplete = null;
        this.onProgress = null;
        this.onComplete = null;
        this.onStop = null;


        /*
         * Statistics.
         */
        this.renderStartTime = 0;

        this.calculatedPoints = 0;
        this.totalPoints = 0;
    }


    /* =====================================================
       SETTINGS
       ===================================================== */

    setMaxIterations(value) {

        value =
            Math.floor(value);


        if (value < 1) {

            throw new RangeError(
                "Maximum iterations must be at least 1."
            );
        }


        this.maxIterations =
            value;
    }


    setBailout(value) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            value <= 0
        ) {

            throw new RangeError(
                "Bailout must be a positive number."
            );
        }


        this.bailout =
            value;
    }


    setSmoothColouring(value) {

        this.smoothColouring =
            Boolean(value);
    }


    setOptimisations(value) {

        this.optimisations =
            Boolean(value);
    }


    setGradient(gradient) {

        this.gradient =
            gradient;
    }


    setGradientMultiplier(value) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            value <= 0
        ) {

            throw new RangeError(
                "Gradient multiplier must be positive."
            );
        }


        this.gradientMultiplier =
            value;
    }


    setFrameBudget(milliseconds) {

        if (
            typeof milliseconds !== "number" ||
            !Number.isFinite(milliseconds) ||
            milliseconds <= 0
        ) {

            throw new RangeError(
                "Frame budget must be positive."
            );
        }


        this.frameBudget =
            milliseconds;
    }


    setAntiAliasing(value) {

        this.antiAliasing =
            Boolean(value);
    }


    isAntiAliasing() {

        return this.antiAliasing;
    }


    /* =====================================================
       MAIN RENDER
       ===================================================== */

    async render() {

        const generation =
            ++this.renderGeneration;


        this.running = true;

        this.calculatedPoints = 0;

        this.renderStartTime =
            performance.now();


        /*
         * Clear previous image and calculation data.
         */
        this.canvasRenderer
            .beginRender();


        /*
         * Count progressive work.
         */
        this.totalPoints =
            this.calculateTotalSampleCount();


        /*
         * Add one progress unit for every final
         * anti-aliased pixel.
         */
        if (this.antiAliasing) {

            this.totalPoints +=
                this.canvasRenderer.getWidth() *
                this.canvasRenderer.getHeight();
        }


        try {

            /* =============================================
               PROGRESSIVE PASSES
               ============================================= */

            for (
                let passIndex = 0;
                passIndex < this.passes.length;
                passIndex++
            ) {

                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                const blockSize =
                    this.passes[
                        passIndex
                    ];


                if (
                    typeof this.onPassStart ===
                    "function"
                ) {

                    this.onPassStart(
                        blockSize,
                        passIndex,
                        this.passes.length +
                            (
                                this.antiAliasing
                                    ? 1
                                    : 0
                            )
                    );
                }


                await this.renderPass(
                    blockSize,
                    generation
                );


                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                this.canvasRenderer
                    .present();


                if (
                    typeof this.onPassComplete ===
                    "function"
                ) {

                    this.onPassComplete(
                        blockSize,
                        passIndex,
                        this.passes.length +
                            (
                                this.antiAliasing
                                    ? 1
                                    : 0
                            )
                    );
                }
            }


            /* =============================================
               FINAL 3x3 SUPERSAMPLING
               ============================================= */

            if (this.antiAliasing) {

                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                if (
                    typeof this.onPassStart ===
                    "function"
                ) {

                    this.onPassStart(
                        "AA",
                        this.passes.length,
                        this.passes.length + 1
                    );
                }


                await this.renderAntiAliasingPass(
                    generation
                );


                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                this.canvasRenderer
                    .present();


                if (
                    typeof this.onPassComplete ===
                    "function"
                ) {

                    this.onPassComplete(
                        "AA",
                        this.passes.length,
                        this.passes.length + 1
                    );
                }
            }


            if (
                !this.isGenerationActive(
                    generation
                )
            ) {

                return false;
            }


            this.running =
                false;


            const elapsed =
                performance.now() -
                this.renderStartTime;


            if (
                typeof this.onProgress ===
                "function"
            ) {

                this.onProgress(
                    1.0,
                    this.calculatedPoints,
                    this.totalPoints
                );
            }


            if (
                typeof this.onComplete ===
                "function"
            ) {

                this.onComplete({

                    elapsedMilliseconds:
                        elapsed,

                    calculatedPoints:
                        this.calculatedPoints,

                    antiAliasing:
                        this.antiAliasing

                });
            }


            return true;

        } catch (error) {

            if (
                generation ===
                this.renderGeneration
            ) {

                this.running =
                    false;
            }


            throw error;
        }
    }


    /* =====================================================
       ONE PROGRESSIVE PASS
       ===================================================== */

    async renderPass(
        blockSize,
        generation
    ) {

        const width =
            this.canvasRenderer
                .getWidth();


        const height =
            this.canvasRenderer
                .getHeight();


        let frameStart =
            performance.now();


        for (
            let y = 0;
            y < height;
            y += blockSize
        ) {

            for (
                let x = 0;
                x < width;
                x += blockSize
            ) {

                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                /*
                 * A coarser pass may already have
                 * calculated this exact coordinate.
                 */
                if (
                    this.canvasRenderer
                        .isComputed(
                            x,
                            y
                        )
                ) {

                    continue;
                }


                this.calculateSample(
                    x,
                    y,
                    blockSize
                );


                this.calculatedPoints++;


                /*
                 * Yield when we've consumed the
                 * browser time budget.
                 */
                if (
                    performance.now() -
                    frameStart >=
                    this.frameBudget
                ) {

                    this.canvasRenderer
                        .present();


                    this.reportProgress();


                    await this.nextFrame();


                    if (
                        !this.isGenerationActive(
                            generation
                        )
                    ) {

                        return false;
                    }


                    frameStart =
                        performance.now();
                }
            }
        }


        this.canvasRenderer
            .present();


        this.reportProgress();


        return true;
    }


    /* =====================================================
       NORMAL INTEGER PIXEL SAMPLE
       ===================================================== */

    calculateSample(
        pixelX,
        pixelY,
        blockSize
    ) {

        const result =
            this.calculatePoint(
                pixelX,
                pixelY
            );


        /*
         * Store only the actual calculated point.
         */
        this.canvasRenderer
            .storeResult(
                pixelX,
                pixelY,
                result.value,
                result.inSet
            );


        const gradientPosition =
            this.valueToGradientPosition(
                result.value
            );


        /*
         * Fill the progressive approximation block.
         */
        this.canvasRenderer
            .fillGradientBlock(
                pixelX,
                pixelY,
                blockSize,
                gradientPosition,
                result.inSet,
                this.gradient
            );
    }


    /* =====================================================
       CALCULATE MANDELBROT AT ANY COORDINATE

       pixelX / pixelY may be fractional.

       This is what allows the AA pass to sample
       between normal canvas pixels.
       ===================================================== */

    calculatePoint(
        pixelX,
        pixelY
    ) {

        const coordinate =
            this.coordinateMapper
                .pixelToNumberCoordinate(
                    pixelX,
                    pixelY
                );


        let output;


        if (this.optimisations) {

            output =
                MandelbrotProcessor.process(
                    coordinate.x,
                    coordinate.y,
                    this.maxIterations,
                    this.bailout
                );

        } else {

            output =
                this.processWithoutOptimisations(
                    coordinate.x,
                    coordinate.y
                );
        }


        let value;


        if (
            this.smoothColouring &&
            !output.isInSet()
        ) {

            value =
                output.getSmoothIteration();

        } else {

            value =
                output.getIterations();
        }


        /*
         * Defensive fallback.
         */
        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {

            value =
                output.getIterations();
        }


        return {

            value:
                value,

            inSet:
                output.isInSet(),

            output:
                output

        };
    }


    /* =====================================================
       FINAL 3x3 SUPERSAMPLING

             -1/3       0       +1/3

               •        •        •

               •        X        •

               •        •        •

       X = existing centre pixel.

       Eight additional Mandelbrot points are
       calculated and their colours are averaged
       with the centre colour.
       ===================================================== */

    async renderAntiAliasingPass(
        generation
    ) {

        const width =
            this.canvasRenderer
                .getWidth();


        const height =
            this.canvasRenderer
                .getHeight();


        const offset =
            this.subPixelOffset;


        /*
         * Centre [0, 0] is deliberately absent.
         *
         * We already calculated it during the
         * final 1x1 pass.
         */
        const offsets = [

            [-offset, -offset],
            [0,       -offset],
            [offset,  -offset],

            [-offset,  0],
            [offset,   0],

            [-offset,  offset],
            [0,        offset],
            [offset,   offset]

        ];


        let frameStart =
            performance.now();


        for (
            let y = 0;
            y < height;
            y++
        ) {

            for (
                let x = 0;
                x < width;
                x++
            ) {

                if (
                    !this.isGenerationActive(
                        generation
                    )
                ) {

                    return false;
                }


                /* =========================================
                   EXISTING CENTRE SAMPLE

                   IMPORTANT:
                   These are the actual method names in
                   the Mandelbrot CanvasRenderer.
                   ========================================= */

                const centreValue =
                    this.canvasRenderer
                        .getValue(
                            x,
                            y
                        );


                const centreInSet =
                    this.canvasRenderer
                        .isPointInsideSet(
                            x,
                            y
                        );


                const centreColour =
                    this.getColourForSample(
                        centreValue,
                        centreInSet
                    );


                let red =
                    centreColour.r;

                let green =
                    centreColour.g;

                let blue =
                    centreColour.b;

                let alpha =
                    centreColour.a;


                /* =========================================
                   EIGHT ADDITIONAL SUBPIXELS
                   ========================================= */

                for (
                    const sampleOffset of offsets
                ) {

                    const sampleX =
                        x +
                        sampleOffset[0];


                    const sampleY =
                        y +
                        sampleOffset[1];


                    const result =
                        this.calculatePoint(
                            sampleX,
                            sampleY
                        );


                    const colour =
                        this.getColourForSample(
                            result.value,
                            result.inSet
                        );


                    red +=
                        colour.r;

                    green +=
                        colour.g;

                    blue +=
                        colour.b;

                    alpha +=
                        (
                            colour.a === undefined
                                ? 255
                                : colour.a
                        );
                }


                /* =========================================
                   AVERAGE NINE SAMPLES
                   ========================================= */

                red /= 9.0;
                green /= 9.0;
                blue /= 9.0;
                alpha /= 9.0;


                /*
                 * Mandelbrot CanvasRenderer already
                 * provides setPixel().
                 */
                this.canvasRenderer
                    .setPixel(
                        x,
                        y,
                        red,
                        green,
                        blue,
                        alpha
                    );


                this.calculatedPoints++;


                /*
                 * AA is expensive, so allow the
                 * browser to repaint regularly.
                 */
                if (
                    performance.now() -
                    frameStart >=
                    this.frameBudget
                ) {

                    this.canvasRenderer
                        .present();


                    this.reportProgress();


                    await this.nextFrame();


                    if (
                        !this.isGenerationActive(
                            generation
                        )
                    ) {

                        return false;
                    }


                    frameStart =
                        performance.now();
                }
            }
        }


        this.canvasRenderer
            .present();


        this.reportProgress();


        return true;
    }


    /* =====================================================
       SAMPLE -> RGBA

       IMPORTANT:
       There is NO canvasRenderer.normaliseColour()
       call here.

       The Mandelbrot gradient already supplies the
       colour object used by CanvasRenderer.
       ===================================================== */

    getColourForSample(
        value,
        inSet
    ) {

        /*
         * Mandelbrot set itself is black.
         */
        if (inSet) {

            return {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            };
        }


        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {

            return {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            };
        }


        const gradientPosition =
            this.valueToGradientPosition(
                value
            );


        /*
         * DIRECTLY return the gradient colour.
         *
         * Do NOT call:
         *
         * canvasRenderer.normaliseColour()
         *
         * because the Mandelbrot CanvasRenderer
         * doesn't have that method.
         */
        const colour =
            this.gradient
                .getLookupColour(
                    gradientPosition
                );


        /*
         * Ensure alpha exists even if the gradient
         * happens to return RGB only.
         */
        return {

            r:
                colour.r,

            g:
                colour.g,

            b:
                colour.b,

            a:
                colour.a === undefined
                    ? 255
                    : colour.a

        };
    }


    /* =====================================================
       MANDELBROT WITHOUT OPTIMISATIONS
       ===================================================== */

    processWithoutOptimisations(
        px,
        py
    ) {

        let zx = 0.0;
        let zy = 0.0;

        let zx2 = 0.0;
        let zy2 = 0.0;


        for (
            let iteration = 0;
            iteration < this.maxIterations;
            iteration++
        ) {

            zy =
                2.0 * zx * zy +
                py;


            zx =
                zx2 -
                zy2 +
                px;


            zx2 =
                zx * zx;

            zy2 =
                zy * zy;


            if (
                zx2 + zy2 >
                this.bailout
            ) {

                return new MandelbrotOutput(
                    iteration + 1,
                    zx,
                    zy,
                    false,
                    MandelbrotOutput.HowFound.NOT
                );
            }
        }


        return new MandelbrotOutput(
            this.maxIterations,
            zx,
            zy,
            true,
            MandelbrotOutput.HowFound.MAX_ITERATION
        );
    }


    /* =====================================================
       ITERATION -> GRADIENT
       ===================================================== */

    valueToGradientPosition(
        value
    ) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {

            return 0.0;
        }


        let position =
            value /
            this.gradientMultiplier;


        position -=
            Math.floor(
                position
            );


        if (
            position < 0
        ) {

            position +=
                1.0;
        }


        return position;
    }


    /* =====================================================
       RECOLOUR
       ===================================================== */

    recolour() {

        /*
         * This recolours the stored centre samples.
         *
         * The eight AA samples are not stored.
         * Therefore a full render is needed if you
         * want the changed gradient to receive fresh
         * supersampling too.
         */
        this.canvasRenderer
            .recolour(
                this.gradient,

                value =>
                    this.valueToGradientPosition(
                        value
                    )
            );
    }


    /* =====================================================
       STOP
       ===================================================== */

    stop() {

        if (!this.running) {

            return;
        }


        this.renderGeneration++;


        this.running =
            false;


        if (
            typeof this.onStop ===
            "function"
        ) {

            this.onStop({

                calculatedPoints:
                    this.calculatedPoints,

                elapsedMilliseconds:
                    performance.now() -
                    this.renderStartTime

            });
        }
    }


    isRunning() {

        return this.running;
    }


    isGenerationActive(
        generation
    ) {

        return (
            this.running &&
            generation ===
                this.renderGeneration
        );
    }


    /* =====================================================
       BROWSER YIELD
       ===================================================== */

    nextFrame() {

        return new Promise(
            resolve => {

                requestAnimationFrame(
                    resolve
                );
            }
        );
    }


    /* =====================================================
       PROGRESS
       ===================================================== */

    reportProgress() {

        if (
            typeof this.onProgress !==
            "function"
        ) {

            return;
        }


        const progress =
            this.totalPoints > 0

                ? this.calculatedPoints /
                    this.totalPoints

                : 0.0;


        this.onProgress(
            Math.min(
                1.0,
                progress
            ),
            this.calculatedPoints,
            this.totalPoints
        );
    }


    /* =====================================================
       COUNT UNIQUE PROGRESSIVE SAMPLES
       ===================================================== */

    calculateTotalSampleCount() {

        const width =
            this.canvasRenderer
                .getWidth();


        const height =
            this.canvasRenderer
                .getHeight();


        const seen =
            new Uint8Array(
                width *
                height
            );


        let count = 0;


        for (
            const blockSize of
                this.passes
        ) {

            for (
                let y = 0;
                y < height;
                y += blockSize
            ) {

                for (
                    let x = 0;
                    x < width;
                    x += blockSize
                ) {

                    const index =
                        y * width +
                        x;


                    if (
                        seen[index] !== 0
                    ) {

                        continue;
                    }


                    seen[index] = 1;

                    count++;
                }
            }
        }


        return count;
    }


    /* =====================================================
       CALLBACKS
       ===================================================== */

    setPassStartListener(
        callback
    ) {

        this.onPassStart =
            callback;
    }


    setPassCompleteListener(
        callback
    ) {

        this.onPassComplete =
            callback;
    }


    setProgressListener(
        callback
    ) {

        this.onProgress =
            callback;
    }


    setCompleteListener(
        callback
    ) {

        this.onComplete =
            callback;
    }


    setStopListener(
        callback
    ) {

        this.onStop =
            callback;
    }
}
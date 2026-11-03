class MandelbrotInput {

    /**
     * Input for a single Mandelbrot coordinate calculation.
     *
     * startX and startY may be either:
     *
     * - JavaScript Numbers
     * - DoubleDouble instances
     *
     * The processor determines which arithmetic implementation
     * should be used.
     *
     * @param {*} startX
     * @param {*} startY
     * @param {number} maxIteration
     * @param {number} bailout
     */
    constructor(
        startX,
        startY,
        maxIteration = 500,
        bailout = 4.0
    ) {

        this.setStartX(startX);
        this.setStartY(startY);

        this.setMaxIteration(maxIteration);
        this.setBailout(bailout);
    }


    /* =====================================================
       X coordinate
       ===================================================== */

    getStartX() {

        return this.startX;
    }


    setStartX(startX) {

        if (startX === null || startX === undefined) {

            throw new TypeError(
                "Mandelbrot X coordinate cannot be null."
            );
        }

        this.startX = startX;
    }


    /* =====================================================
       Y coordinate
       ===================================================== */

    getStartY() {

        return this.startY;
    }


    setStartY(startY) {

        if (startY === null || startY === undefined) {

            throw new TypeError(
                "Mandelbrot Y coordinate cannot be null."
            );
        }

        this.startY = startY;
    }


    /* =====================================================
       Maximum iterations
       ===================================================== */

    getMaxIteration() {

        return this.maxIteration;
    }


    setMaxIteration(maxIteration) {

        if (
            !Number.isInteger(maxIteration) ||
            maxIteration < 1
        ) {

            throw new RangeError(
                "Maximum iterations must be a positive integer."
            );
        }

        this.maxIteration = maxIteration;
    }


    /* =====================================================
       Bailout
       ===================================================== */

    getBailout() {

        return this.bailout;
    }


    setBailout(bailout) {

        if (
            typeof bailout !== "number" ||
            !Number.isFinite(bailout) ||
            bailout <= 0
        ) {

            throw new RangeError(
                "Bailout must be a positive finite number."
            );
        }

        this.bailout = bailout;
    }


    /* =====================================================
       Coordinate
       ===================================================== */

    getCoordinate() {

        return {
            x: this.startX,
            y: this.startY
        };
    }


    /* =====================================================
       Copy
       ===================================================== */

    clone() {

        /*
         * If DoubleDouble provides clone(), preserve the
         * coordinate independently.
         */

        const x =
            this.startX &&
            typeof this.startX.clone === "function"

                ? this.startX.clone()
                : this.startX;


        const y =
            this.startY &&
            typeof this.startY.clone === "function"

                ? this.startY.clone()
                : this.startY;


        return new MandelbrotInput(
            x,
            y,
            this.maxIteration,
            this.bailout
        );
    }


    /* =====================================================
       Utility
       ===================================================== */

    toString() {

        return (
            "MandelbrotInput(" +
            `x=${this.startX}, ` +
            `y=${this.startY}, ` +
            `maxIteration=${this.maxIteration}, ` +
            `bailout=${this.bailout}` +
            ")"
        );
    }
}
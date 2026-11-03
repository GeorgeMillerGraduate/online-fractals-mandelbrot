class MandelbrotOutput {

    /**
     * Result of calculating one Mandelbrot coordinate.
     *
     * @param {number} iterations
     * @param {*} finalX
     * @param {*} finalY
     * @param {boolean} inSet
     * @param {string} howFound
     */
    constructor(
        iterations = 0,
        finalX = 0,
        finalY = 0,
        inSet = false,
        howFound = MandelbrotOutput.HowFound.NOT
    ) {

        this.iterations = iterations;

        this.finalX = finalX;
        this.finalY = finalY;

        this.inSet = inSet;
        this.howFound = howFound;
    }


    /* =====================================================
       Iterations
       ===================================================== */

    getIterations() {

        return this.iterations;
    }


    setIterations(iterations) {

        if (
            !Number.isInteger(iterations) ||
            iterations < 0
        ) {

            throw new RangeError(
                "Iterations must be a non-negative integer."
            );
        }

        this.iterations = iterations;
    }


    /* =====================================================
       Final orbit X
       ===================================================== */

    getFinalX() {

        return this.finalX;
    }


    setFinalX(finalX) {

        this.finalX = finalX;
    }


    /* =====================================================
       Final orbit Y
       ===================================================== */

    getFinalY() {

        return this.finalY;
    }


    setFinalY(finalY) {

        this.finalY = finalY;
    }


    /* =====================================================
       Set membership
       ===================================================== */

    isInSet() {

        return this.inSet;
    }


    setInSet(inSet) {

        this.inSet = Boolean(inSet);
    }


    /* =====================================================
       How result was found
       ===================================================== */

    getHowFound() {

        return this.howFound;
    }


    setHowFound(howFound) {

        if (
            !Object.values(
                MandelbrotOutput.HowFound
            ).includes(howFound)
        ) {

            throw new Error(
                `Unknown Mandelbrot result type: ${howFound}`
            );
        }

        this.howFound = howFound;
    }


    /* =====================================================
       Escaped
       ===================================================== */

    hasEscaped() {

        return !this.inSet;
    }


    /* =====================================================
       Final magnitude squared
       ===================================================== */

    getMagnitudeSquared() {

        /*
         * Standard JavaScript Number path.
         */

        if (
            typeof this.finalX === "number" &&
            typeof this.finalY === "number"
        ) {

            return (
                this.finalX * this.finalX +
                this.finalY * this.finalY
            );
        }


        /*
         * DoubleDouble path.
         *
         * Once DoubleDouble.js is implemented this allows
         * the output object to retain high-precision orbit
         * coordinates.
         */

        if (
            this.finalX &&
            this.finalY &&
            typeof this.finalX.multiply === "function" &&
            typeof this.finalY.multiply === "function"
        ) {

            const xSquared =
                this.finalX.multiply(this.finalX);

            const ySquared =
                this.finalY.multiply(this.finalY);

            return xSquared.add(ySquared);
        }


        throw new TypeError(
            "Final coordinates do not support magnitude calculation."
        );
    }


    /* =====================================================
       Smooth iteration value
       ===================================================== */

    getSmoothIteration() {

        /*
         * Points inside the set don't have an escape-time
         * colour value.
         */

        if (this.inSet) {

            return this.iterations;
        }


        let x;
        let y;


        /*
         * Convert only the FINAL escaped orbit value to
         * Number.
         *
         * This is safe for colour calculation. It does not
         * affect the high-precision coordinate calculations
         * used by the Mandelbrot processor.
         */

        if (typeof this.finalX === "number") {

            x = this.finalX;

        } else if (
            this.finalX &&
            typeof this.finalX.toNumber === "function"
        ) {

            x = this.finalX.toNumber();

        } else {

            return this.iterations;
        }


        if (typeof this.finalY === "number") {

            y = this.finalY;

        } else if (
            this.finalY &&
            typeof this.finalY.toNumber === "function"
        ) {

            y = this.finalY.toNumber();

        } else {

            return this.iterations;
        }


        const magnitudeSquared =
            x * x + y * y;


        if (
            !Number.isFinite(magnitudeSquared) ||
            magnitudeSquared <= 1
        ) {

            return this.iterations;
        }


        /*
         * Continuous escape-time colouring:
         *
         * n + 1 - log(log(|z|)) / log(2)
         *
         * Since we have |z|²:
         *
         * |z| = sqrt(|z|²)
         */

        const magnitude =
            Math.sqrt(magnitudeSquared);


        const smooth =
            this.iterations +
            1 -
            Math.log(
                Math.log(magnitude)
            ) /
            Math.log(2);


        if (!Number.isFinite(smooth)) {

            return this.iterations;
        }


        return smooth;
    }


    /* =====================================================
       Copy
       ===================================================== */

    clone() {

        const x =
            this.finalX &&
            typeof this.finalX.clone === "function"

                ? this.finalX.clone()
                : this.finalX;


        const y =
            this.finalY &&
            typeof this.finalY.clone === "function"

                ? this.finalY.clone()
                : this.finalY;


        return new MandelbrotOutput(
            this.iterations,
            x,
            y,
            this.inSet,
            this.howFound
        );
    }


    /* =====================================================
       Utility
       ===================================================== */

    toString() {

        return (
            "MandelbrotOutput(" +
            `iterations=${this.iterations}, ` +
            `finalX=${this.finalX}, ` +
            `finalY=${this.finalY}, ` +
            `inSet=${this.inSet}, ` +
            `howFound=${this.howFound}` +
            ")"
        );
    }
}


/* =========================================================
   Result types

   Mirrors the Java HowFound enum.
   ========================================================= */

MandelbrotOutput.HowFound = Object.freeze({

    MAX_ITERATION: "MAX_ITERATION",

    BULB: "BULB",

    CARDIOID: "CARDIOID",

    PERIOD: "PERIOD",

    NOT: "NOT"

});
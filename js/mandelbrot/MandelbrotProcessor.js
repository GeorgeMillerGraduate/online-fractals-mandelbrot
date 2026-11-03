class MandelbrotProcessor {

    /*
     * Periodicity tolerance used by the original Java
     * double-precision processor.
     */
    static PERIOD_EPSILON = 1e-17;

    /*
     * Initial number of iterations between periodicity
     * comparisons.
     */
    static INITIAL_PERIOD_INTERVAL = 3;

    /*
     * Distance between hare/tortoise comparisons.
     */
    static TORTOISE_LAG = 10;

    /* =====================================================
     Main processing function
     ===================================================== */

    static processCoordinate(input) {

        const px = input.getStartX();
        const py = input.getStartY();

        const maxIteration =
                input.getMaxIteration();

        const bailout =
                input.getBailout();


        /*
         * This processor is currently the fast native
         * JavaScript Number implementation.
         *
         * DoubleDouble processing will be added separately
         * so we don't burden every ordinary calculation with
         * object/function overhead.
         */

        if (
                typeof px !== "number" ||
                typeof py !== "number"
                ) {

            throw new TypeError(
                    "MandelbrotProcessor currently expects Number coordinates."
                    );
        }


        /* =================================================
         Main cardioid test
         ================================================= */

        if (this.isInsideMainCardioid(px, py)) {

            return new MandelbrotOutput(
                    0,
                    px,
                    py,
                    true,
                    MandelbrotOutput.HowFound.CARDIOID
                    );
        }


        /* =================================================
         Period-2 bulb test
         ================================================= */

        if (this.isInsidePeriod2Bulb(px, py)) {

            return new MandelbrotOutput(
                    0,
                    px,
                    py,
                    true,
                    MandelbrotOutput.HowFound.BULB
                    );
        }


        /* =================================================
         Initial orbit
         ================================================= */

        let zx = 0.0;
        let zy = 0.0;

        /*
         * Cached squares.
         *
         * Avoid recalculating:
         *
         * zx * zx
         * zy * zy
         *
         * multiple times during every iteration.
         */

        let zx2 = 0.0;
        let zy2 = 0.0;


        /* =================================================
         Periodicity memory
         ================================================= */

        let hx = 0.0;
        let hy = 0.0;

        let periodInterval =
                MandelbrotProcessor.INITIAL_PERIOD_INTERVAL;

        let periodCounter = 0;
        let periodUpdates = 0;


        /* =================================================
         Hare / tortoise cycle memory
         ================================================= */

        let tx = 0.0;
        let ty = 0.0;

        let tortoiseCounter = 0;


        /* =================================================
         Iteration
         ================================================= */

        for (
                let iteration = 0;
                iteration < maxIteration;
                iteration++
                ) {

            /*
             * Mandelbrot equation:
             *
             * z(n+1) = z(n)^2 + c
             *
             * Real:
             *
             * zx' = zx² - zy² + px
             *
             * Imaginary:
             *
             * zy' = 2*zx*zy + py
             *
             * IMPORTANT:
             *
             * Calculate zy before replacing zx because the
             * imaginary equation requires the old zx.
             */

            zy =
                    2.0 * zx * zy +
                    py;

            zx =
                    zx2 -
                    zy2 +
                    px;


            /*
             * Cache new squares.
             */

            zx2 =
                    zx * zx;

            zy2 =
                    zy * zy;


            /* =============================================
             Escape test
             ============================================= */

            if (
                    zx2 + zy2 >
                    bailout
                    ) {

                return new MandelbrotOutput(
                        iteration + 1,
                        zx,
                        zy,
                        false,
                        MandelbrotOutput.HowFound.NOT
                        );
            }


            /* =============================================
             Periodicity detection
             ============================================= */

            periodCounter++;


            if (
                    periodCounter >=
                    periodInterval
                    ) {

                /*
                 * If the orbit has returned extremely close
                 * to an earlier position, it is periodic and
                 * therefore considered inside the set.
                 */

                if (
                        Math.abs(zx - hx) <
                        MandelbrotProcessor.PERIOD_EPSILON
                        &&
                        Math.abs(zy - hy) <
                        MandelbrotProcessor.PERIOD_EPSILON
                        ) {

                    return new MandelbrotOutput(
                            iteration + 1,
                            zx,
                            zy,
                            true,
                            MandelbrotOutput.HowFound.PERIOD
                            );
                }


                /*
                 * Store current position for the next
                 * periodicity comparison.
                 */

                hx = zx;
                hy = zy;

                periodCounter = 0;

                periodUpdates++;


                /*
                 * The Java implementation progressively
                 * reduces the frequency of periodicity
                 * checks as the orbit continues.
                 *
                 * Every ten updates, double the interval.
                 */

                if (
                        periodUpdates % 10 === 0
                        ) {

                    periodInterval *= 2;
                }
            }


            /* =============================================
             Spaced hare / tortoise cycle detection
             ============================================= */

            tortoiseCounter++;


            if (
                    tortoiseCounter >=
                    MandelbrotProcessor.TORTOISE_LAG
                    ) {

                /*
                 * Compare the current orbit position against
                 * the stored tortoise position.
                 */

                if (
                        Math.abs(zx - tx) <
                        MandelbrotProcessor.PERIOD_EPSILON
                        &&
                        Math.abs(zy - ty) <
                        MandelbrotProcessor.PERIOD_EPSILON
                        ) {

                    return new MandelbrotOutput(
                            iteration + 1,
                            zx,
                            zy,
                            true,
                            MandelbrotOutput.HowFound.PERIOD
                            );
                }


                /*
                 * Advance the tortoise.
                 */

                tx = zx;
                ty = zy;

                tortoiseCounter = 0;
            }
        }


        /* =================================================
         Maximum iteration reached
         ================================================= */

        return new MandelbrotOutput(
                maxIteration,
                zx,
                zy,
                true,
                MandelbrotOutput.HowFound.MAX_ITERATION
                );
    }

    /* =====================================================
     Main cardioid
     
     Tests whether c is guaranteed to be inside the
     Mandelbrot set's main cardioid.
     ===================================================== */

    static isInsideMainCardioid(x, y) {

        /*
         * q = (x - 1/4)^2 + y^2
         *
         * Inside when:
         *
         * q * (q + (x - 1/4)) <= y^2 / 4
         */

        const xMinusQuarter =
                x - 0.25;

        const ySquared =
                y * y;

        const q =
                xMinusQuarter * xMinusQuarter +
                ySquared;


        return (
                q * (
                        q +
                        xMinusQuarter
                        )
                <=
                0.25 * ySquared
                );
    }

    /* =====================================================
     Period-2 bulb
     
     Circle centred at (-1, 0) with radius 1/4.
     ===================================================== */

    static isInsidePeriod2Bulb(x, y) {

        const xPlusOne =
                x + 1.0;


        return (
                xPlusOne * xPlusOne +
                y * y
                <=
                0.0625
                );
    }

    /* =====================================================
     Convenience function
     
     Allows the renderer to avoid allocating a
     MandelbrotInput object for every single pixel.
     ===================================================== */

    static process(
            x,
            y,
            maxIteration = 500,
            bailout = 4.0
            ) {

        const input =
                new MandelbrotInput(
                        x,
                        y,
                        maxIteration,
                        bailout
                        );


        return this.processCoordinate(
                input
                );
    }
}
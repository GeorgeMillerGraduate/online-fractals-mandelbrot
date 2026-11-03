class CoordinateMapper {

    /**
     * Maps canvas pixels to Mandelbrot coordinates.
     *
     * All Mandelbrot-plane values are stored as DoubleDouble.
     *
     * Canvas convention:
     *
     *      (0, 0) --------------------> X
     *        |
     *        |
     *        |
     *        v
     *        Y
     *
     * Mandelbrot convention:
     *
     *        +Y
     *         ^
     *         |
     *         |
     *         +----------------------> +X
     *
     * Therefore canvas Y must be inverted.
     */
    constructor(
        width,
        height,
        centerX = "-0.5",
        centerY = "0",
        magnification = "1"
    ) {

        this.width = Math.max(
            1,
            Math.floor(width)
        );

        this.height = Math.max(
            1,
            Math.floor(height)
        );


        this.centerX =
            this.toDoubleDouble(centerX);

        this.centerY =
            this.toDoubleDouble(centerY);

        this.magnification =
            this.toDoubleDouble(
                magnification
            );


        if (
            this.magnification
                .compareTo(DoubleDouble.ZERO)
            <= 0
        ) {

            throw new RangeError(
                "Magnification must be greater than zero."
            );
        }


        this.recalculate();
    }


    /* =====================================================
       Conversion helper
       ===================================================== */

    toDoubleDouble(value) {

        if (value instanceof DoubleDouble) {

            return value.clone();
        }


        if (typeof value === "string") {

            return DoubleDouble.fromString(
                value
            );
        }


        if (typeof value === "number") {

            return DoubleDouble.fromNumber(
                value
            );
        }


        throw new TypeError(
            "Coordinate values must be DoubleDouble, string, or number."
        );
    }


    /* =====================================================
       Recalculate viewport
       ===================================================== */

    recalculate() {

        /*
         * Standard Mandelbrot viewport at magnification 1:
         *
         * plane width = 4
         *
         * As magnification increases:
         *
         * planeWidth = 4 / magnification
         */

        this.planeWidth =
            DoubleDouble
                .fromNumber(4.0)
                .divide(
                    this.magnification
                );


        /*
         * Preserve canvas aspect ratio.
         *
         * planeHeight =
         *     planeWidth * height / width
         */

        this.planeHeight =
            this.planeWidth
                .multiplyNumber(
                    this.height
                )
                .divideNumber(
                    this.width
                );


        this.halfPlaneWidth =
            this.planeWidth
                .divideNumber(2.0);


        this.halfPlaneHeight =
            this.planeHeight
                .divideNumber(2.0);


        /*
         * Mandelbrot bounds.
         */

        this.minX =
            this.centerX.subtract(
                this.halfPlaneWidth
            );

        this.maxX =
            this.centerX.add(
                this.halfPlaneWidth
            );

        this.minY =
            this.centerY.subtract(
                this.halfPlaneHeight
            );

        this.maxY =
            this.centerY.add(
                this.halfPlaneHeight
            );


        /*
         * Pixel spacing.
         *
         * We map the outermost pixel centres to min/max,
         * matching the width-1 / height-1 approach used by
         * the Java coordinate conversion.
         */

        if (this.width > 1) {

            this.pixelWidth =
                this.planeWidth
                    .divideNumber(
                        this.width - 1
                    );

        } else {

            this.pixelWidth =
                DoubleDouble.ZERO.clone();
        }


        if (this.height > 1) {

            this.pixelHeight =
                this.planeHeight
                    .divideNumber(
                        this.height - 1
                    );

        } else {

            this.pixelHeight =
                DoubleDouble.ZERO.clone();
        }
    }


    /* =====================================================
       Pixel -> Mandelbrot X
       ===================================================== */

    pixelToX(pixelX) {

        return this.minX.add(
            this.pixelWidth.multiplyNumber(
                pixelX
            )
        );
    }


    /* =====================================================
       Pixel -> Mandelbrot Y

       Canvas Y increases downward.

       Mandelbrot Y increases upward.

       Therefore:
           y = maxY - pixelY * pixelHeight
       ===================================================== */

    pixelToY(pixelY) {

        return this.maxY.subtract(
            this.pixelHeight.multiplyNumber(
                pixelY
            )
        );
    }


    /* =====================================================
       Pixel -> coordinate
       ===================================================== */

    pixelToCoordinate(
        pixelX,
        pixelY
    ) {

        return new ComplexDoubleDouble(
            this.pixelToX(pixelX),
            this.pixelToY(pixelY)
        );
    }


    /* =====================================================
       Faster separate coordinate result

       Useful in the renderer when we don't want to allocate
       a ComplexDoubleDouble object.
       ===================================================== */

    pixelToComponents(
        pixelX,
        pixelY
    ) {

        return {

            x: this.pixelToX(pixelX),

            y: this.pixelToY(pixelY)
        };
    }


    /* =====================================================
       Number coordinate

       Fast renderer convenience method.

       This intentionally loses DoubleDouble precision and
       should only be used while the current zoom level still
       fits safely inside ordinary Number precision.
       ===================================================== */

    pixelToNumberCoordinate(
        pixelX,
        pixelY
    ) {

        return {

            x:
                this.pixelToX(pixelX)
                    .toNumber(),

            y:
                this.pixelToY(pixelY)
                    .toNumber()
        };
    }


    /* =====================================================
       Set centre
       ===================================================== */

    setCenter(
        centerX,
        centerY
    ) {

        this.centerX =
            this.toDoubleDouble(
                centerX
            );

        this.centerY =
            this.toDoubleDouble(
                centerY
            );


        this.recalculate();
    }


    /* =====================================================
       Set magnification
       ===================================================== */

    setMagnification(
        magnification
    ) {

        const value =
            this.toDoubleDouble(
                magnification
            );


        if (
            value.compareTo(
                DoubleDouble.ZERO
            ) <= 0
        ) {

            throw new RangeError(
                "Magnification must be greater than zero."
            );
        }


        this.magnification =
            value;


        this.recalculate();
    }


    /* =====================================================
       Set view
       ===================================================== */

    setView(
        centerX,
        centerY,
        magnification
    ) {

        this.centerX =
            this.toDoubleDouble(
                centerX
            );

        this.centerY =
            this.toDoubleDouble(
                centerY
            );

        this.magnification =
            this.toDoubleDouble(
                magnification
            );


        if (
            this.magnification.compareTo(
                DoubleDouble.ZERO
            ) <= 0
        ) {

            throw new RangeError(
                "Magnification must be greater than zero."
            );
        }


        this.recalculate();
    }


    /* =====================================================
       Set exact Mandelbrot bounds

       Particularly useful after drag-to-zoom.
       ===================================================== */

    setBounds(
        minX,
        maxX,
        minY,
        maxY
    ) {

        minX =
            this.toDoubleDouble(minX);

        maxX =
            this.toDoubleDouble(maxX);

        minY =
            this.toDoubleDouble(minY);

        maxY =
            this.toDoubleDouble(maxY);


        if (
            maxX.compareTo(minX) <= 0 ||
            maxY.compareTo(minY) <= 0
        ) {

            throw new RangeError(
                "Invalid Mandelbrot bounds."
            );
        }


        this.minX = minX;
        this.maxX = maxX;

        this.minY = minY;
        this.maxY = maxY;


        this.planeWidth =
            maxX.subtract(minX);

        this.planeHeight =
            maxY.subtract(minY);


        this.halfPlaneWidth =
            this.planeWidth
                .divideNumber(2);

        this.halfPlaneHeight =
            this.planeHeight
                .divideNumber(2);


        this.centerX =
            minX.add(
                this.halfPlaneWidth
            );

        this.centerY =
            minY.add(
                this.halfPlaneHeight
            );


        /*
         * Magnification is defined from horizontal width:
         *
         * magnification = 4 / planeWidth
         */

        this.magnification =
            DoubleDouble
                .fromNumber(4)
                .divide(
                    this.planeWidth
                );


        this.updatePixelScale();
    }


    /* =====================================================
       Update pixel scale
       ===================================================== */

    updatePixelScale() {

        if (this.width > 1) {

            this.pixelWidth =
                this.planeWidth
                    .divideNumber(
                        this.width - 1
                    );

        } else {

            this.pixelWidth =
                DoubleDouble.ZERO.clone();
        }


        if (this.height > 1) {

            this.pixelHeight =
                this.planeHeight
                    .divideNumber(
                        this.height - 1
                    );

        } else {

            this.pixelHeight =
                DoubleDouble.ZERO.clone();
        }
    }


    /* =====================================================
       Resize canvas mapping
       ===================================================== */

    resize(width, height) {

        this.width =
            Math.max(
                1,
                Math.floor(width)
            );

        this.height =
            Math.max(
                1,
                Math.floor(height)
            );


        /*
         * Keep the horizontal field of view unchanged and
         * adjust vertical field of view for the new aspect
         * ratio.
         */

        this.recalculate();
    }


    /* =====================================================
       Drag rectangle -> new Mandelbrot bounds

       Rectangle may be dragged in any direction.
       ===================================================== */

    rectangleToBounds(
        x1,
        y1,
        x2,
        y2
    ) {

        const left =
            Math.min(x1, x2);

        const right =
            Math.max(x1, x2);

        const top =
            Math.min(y1, y2);

        const bottom =
            Math.max(y1, y2);


        return {

            minX:
                this.pixelToX(left),

            maxX:
                this.pixelToX(right),

            /*
             * Top of screen = maximum Mandelbrot Y.
             */

            maxY:
                this.pixelToY(top),

            minY:
                this.pixelToY(bottom)
        };
    }


    /* =====================================================
       Apply drag zoom
       ===================================================== */

    zoomToRectangle(
        x1,
        y1,
        x2,
        y2
    ) {

        const bounds =
            this.rectangleToBounds(
                x1,
                y1,
                x2,
                y2
            );


        this.setBounds(
            bounds.minX,
            bounds.maxX,
            bounds.minY,
            bounds.maxY
        );


        return bounds;
    }


    /* =====================================================
       Aspect-ratio locked rectangle

       Our canvas is 900x600, so normally this produces a
       3:2 selection.

       The anchor remains fixed while the moving point is
       adjusted to preserve the canvas aspect ratio.
       ===================================================== */

    constrainRectangle(
        startX,
        startY,
        currentX,
        currentY
    ) {

        const aspect =
            this.width /
            this.height;


        let dx =
            currentX -
            startX;

        let dy =
            currentY -
            startY;


        const signX =
            dx < 0 ? -1 : 1;

        const signY =
            dy < 0 ? -1 : 1;


        let absoluteWidth =
            Math.abs(dx);

        let absoluteHeight =
            Math.abs(dy);


        /*
         * Determine which dimension controls the rectangle.
         */

        if (
            absoluteHeight === 0
        ) {

            absoluteHeight =
                absoluteWidth /
                aspect;

        } else if (
            absoluteWidth /
            absoluteHeight >
            aspect
        ) {

            /*
             * Rectangle is too wide.
             */

            absoluteHeight =
                absoluteWidth /
                aspect;

        } else {

            /*
             * Rectangle is too tall.
             */

            absoluteWidth =
                absoluteHeight *
                aspect;
        }


        let endX =
            startX +
            absoluteWidth *
            signX;

        let endY =
            startY +
            absoluteHeight *
            signY;


        /*
         * Keep selection inside canvas.
         */

        if (endX < 0) {

            endX = 0;

            absoluteWidth =
                Math.abs(
                    endX - startX
                );

            absoluteHeight =
                absoluteWidth /
                aspect;

            endY =
                startY +
                absoluteHeight *
                signY;
        }


        if (endX > this.width - 1) {

            endX =
                this.width - 1;

            absoluteWidth =
                Math.abs(
                    endX - startX
                );

            absoluteHeight =
                absoluteWidth /
                aspect;

            endY =
                startY +
                absoluteHeight *
                signY;
        }


        if (endY < 0) {

            endY = 0;

            absoluteHeight =
                Math.abs(
                    endY - startY
                );

            absoluteWidth =
                absoluteHeight *
                aspect;

            endX =
                startX +
                absoluteWidth *
                signX;
        }


        if (endY > this.height - 1) {

            endY =
                this.height - 1;

            absoluteHeight =
                Math.abs(
                    endY - startY
                );

            absoluteWidth =
                absoluteHeight *
                aspect;

            endX =
                startX +
                absoluteWidth *
                signX;
        }


        return {

            startX,
            startY,

            endX,
            endY,

            x:
                Math.min(
                    startX,
                    endX
                ),

            y:
                Math.min(
                    startY,
                    endY
                ),

            width:
                Math.abs(
                    endX -
                    startX
                ),

            height:
                Math.abs(
                    endY -
                    startY
                )
        };
    }


    /* =====================================================
       Zoom out around a pixel

       factor = 2 means twice as much of the Mandelbrot
       plane becomes visible.
       ===================================================== */

    zoomOutAtPixel(
        pixelX,
        pixelY,
        factor = 2
    ) {

        if (
            typeof factor !== "number" ||
            !Number.isFinite(factor) ||
            factor <= 1
        ) {

            throw new RangeError(
                "Zoom-out factor must be greater than 1."
            );
        }


        const pointX =
            this.pixelToX(pixelX);

        const pointY =
            this.pixelToY(pixelY);


        const factorDD =
            DoubleDouble.fromNumber(
                factor
            );


        const newPlaneWidth =
            this.planeWidth.multiply(
                factorDD
            );

        const newPlaneHeight =
            this.planeHeight.multiply(
                factorDD
            );


        /*
         * Centre the expanded view on the selected
         * Mandelbrot coordinate.
         */

        this.centerX =
            pointX;

        this.centerY =
            pointY;

        this.planeWidth =
            newPlaneWidth;

        this.planeHeight =
            newPlaneHeight;


        this.halfPlaneWidth =
            newPlaneWidth
                .divideNumber(2);

        this.halfPlaneHeight =
            newPlaneHeight
                .divideNumber(2);


        this.minX =
            this.centerX.subtract(
                this.halfPlaneWidth
            );

        this.maxX =
            this.centerX.add(
                this.halfPlaneWidth
            );

        this.minY =
            this.centerY.subtract(
                this.halfPlaneHeight
            );

        this.maxY =
            this.centerY.add(
                this.halfPlaneHeight
            );


        this.magnification =
            DoubleDouble
                .fromNumber(4)
                .divide(
                    this.planeWidth
                );


        this.updatePixelScale();
    }


    /* =====================================================
       Reset
       ===================================================== */

    reset() {

        this.centerX =
            DoubleDouble.fromString(
                "-0.5"
            );

        this.centerY =
            DoubleDouble.ZERO.clone();

        this.magnification =
            DoubleDouble.ONE.clone();


        this.recalculate();
    }


    /* =====================================================
       Getters
       ===================================================== */

    getCenterX() {

        return this.centerX.clone();
    }


    getCenterY() {

        return this.centerY.clone();
    }


    getMagnification() {

        return this.magnification.clone();
    }


    getMinX() {

        return this.minX.clone();
    }


    getMaxX() {

        return this.maxX.clone();
    }


    getMinY() {

        return this.minY.clone();
    }


    getMaxY() {

        return this.maxY.clone();
    }


    getPlaneWidth() {

        return this.planeWidth.clone();
    }


    getPlaneHeight() {

        return this.planeHeight.clone();
    }


    getPixelWidth() {

        return this.pixelWidth.clone();
    }


    getPixelHeight() {

        return this.pixelHeight.clone();
    }


    /* =====================================================
       Debug information
       ===================================================== */

    toString() {

        return (
            "CoordinateMapper(" +
            `centerX=${this.centerX}, ` +
            `centerY=${this.centerY}, ` +
            `magnification=${this.magnification}, ` +
            `planeWidth=${this.planeWidth}, ` +
            `planeHeight=${this.planeHeight}` +
            ")"
        );
    }
}
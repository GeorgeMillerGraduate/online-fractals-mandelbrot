class CanvasRenderer {

    constructor(canvasId = "mandelbrotCanvas") {

        this.canvas =
            document.getElementById(canvasId);

        if (!this.canvas) {
            throw new Error(
                `Canvas '${canvasId}' was not found.`
            );
        }

        this.context =
            this.canvas.getContext(
                "2d",
                {
                    alpha: false
                }
            );

        if (!this.context) {
            throw new Error(
                "Unable to create 2D canvas context."
            );
        }

        this.width =
            this.canvas.width;

        this.height =
            this.canvas.height;


        /*
         * Main Mandelbrot image.
         */

        this.imageData =
            this.context.createImageData(
                this.width,
                this.height
            );

        this.pixels =
            this.imageData.data;


        /*
         * Iteration/smooth-value storage.
         *
         * Keeping this separately means changing the
         * gradient does NOT require recalculating the
         * Mandelbrot set.
         */

        this.values =
            new Float64Array(
                this.width * this.height
            );


        /*
         * Marks points that have actually been calculated.
         *
         * This is particularly useful for the progressive
         * 8x8 -> 4x4 -> 2x2 -> 1x1 renderer.
         */

        this.computed =
            new Uint8Array(
                this.width * this.height
            );


        /*
         * Set membership.
         *
         * 0 = escaped
         * 1 = inside set
         */

        this.inside =
            new Uint8Array(
                this.width * this.height
            );


        /*
         * Temporary selection rectangle used by mouse zoom.
         */

        this.selection = null;


        /*
         * Initial background.
         */

        this.clear();
    }


    /* =====================================================
       Dimensions
       ===================================================== */

    getWidth() {

        return this.width;
    }


    getHeight() {

        return this.height;
    }


    getCanvas() {

        return this.canvas;
    }


    getContext() {

        return this.context;
    }


    /* =====================================================
       Resize
       ===================================================== */

    resize(width, height) {

        width =
            Math.max(
                1,
                Math.floor(width)
            );

        height =
            Math.max(
                1,
                Math.floor(height)
            );


        this.canvas.width =
            width;

        this.canvas.height =
            height;


        this.width =
            width;

        this.height =
            height;


        this.imageData =
            this.context.createImageData(
                width,
                height
            );

        this.pixels =
            this.imageData.data;


        this.values =
            new Float64Array(
                width * height
            );

        this.computed =
            new Uint8Array(
                width * height
            );

        this.inside =
            new Uint8Array(
                width * height
            );


        this.selection = null;

        this.clear();
    }


    /* =====================================================
       Clear
       ===================================================== */

    clear(
        r = 8,
        g = 11,
        b = 13
    ) {

        for (
            let i = 0;
            i < this.pixels.length;
            i += 4
        ) {

            this.pixels[i] =
                r;

            this.pixels[i + 1] =
                g;

            this.pixels[i + 2] =
                b;

            this.pixels[i + 3] =
                255;
        }


        this.values.fill(0);

        this.computed.fill(0);

        this.inside.fill(0);


        this.selection = null;


        this.present();
    }


    /* =====================================================
       Start new Mandelbrot render
       ===================================================== */

    beginRender() {

        this.computed.fill(0);

        this.inside.fill(0);

        this.values.fill(0);

        this.selection = null;


        /*
         * Start with black rather than leaving fragments
         * from the previous Mandelbrot image.
         */

        for (
            let i = 0;
            i < this.pixels.length;
            i += 4
        ) {

            this.pixels[i] = 0;
            this.pixels[i + 1] = 0;
            this.pixels[i + 2] = 0;
            this.pixels[i + 3] = 255;
        }


        this.present();
    }


    /* =====================================================
       Pixel indexing
       ===================================================== */

    getPixelIndex(x, y) {

        return (
            y * this.width +
            x
        );
    }


    getByteIndex(x, y) {

        return (
            (
                y * this.width +
                x
            ) * 4
        );
    }


    isInsideCanvas(x, y) {

        return (
            x >= 0 &&
            y >= 0 &&
            x < this.width &&
            y < this.height
        );
    }


    /* =====================================================
       Computed-coordinate tracking
       ===================================================== */

    isComputed(x, y) {

        if (!this.isInsideCanvas(x, y)) {
            return false;
        }


        return (
            this.computed[
                this.getPixelIndex(x, y)
            ] !== 0
        );
    }


    markComputed(x, y) {

        if (!this.isInsideCanvas(x, y)) {
            return;
        }


        this.computed[
            this.getPixelIndex(x, y)
        ] = 1;
    }


    /* =====================================================
       Store Mandelbrot result
       ===================================================== */

    storeResult(
        x,
        y,
        value,
        isInside
    ) {

        if (!this.isInsideCanvas(x, y)) {
            return;
        }


        const index =
            this.getPixelIndex(x, y);


        this.values[index] =
            value;

        this.inside[index] =
            isInside ? 1 : 0;

        this.computed[index] =
            1;
    }


    getValue(x, y) {

        return this.values[
            this.getPixelIndex(x, y)
        ];
    }


    isPointInsideSet(x, y) {

        return (
            this.inside[
                this.getPixelIndex(x, y)
            ] !== 0
        );
    }


    /* =====================================================
       Write exact pixel
       ===================================================== */

    setPixel(
        x,
        y,
        r,
        g,
        b,
        a = 255
    ) {

        if (!this.isInsideCanvas(x, y)) {
            return;
        }


        const offset =
            this.getByteIndex(x, y);


        this.pixels[offset] =
            r;

        this.pixels[offset + 1] =
            g;

        this.pixels[offset + 2] =
            b;

        this.pixels[offset + 3] =
            a;
    }


    /* =====================================================
       Paint from SmoothGradient

       Points inside the Mandelbrot set are black.
       ===================================================== */

    setGradientPixel(
        x,
        y,
        gradientPosition,
        isInside,
        gradient
    ) {

        if (!this.isInsideCanvas(x, y)) {
            return;
        }


        const offset =
            this.getByteIndex(x, y);


        if (isInside) {

            this.pixels[offset] = 0;
            this.pixels[offset + 1] = 0;
            this.pixels[offset + 2] = 0;
            this.pixels[offset + 3] = 255;

            return;
        }


        gradient.writeColour(
            gradientPosition,
            this.pixels,
            offset
        );
    }


    /* =====================================================
       Progressive block painting

       A calculated coordinate can temporarily represent an
       entire block.

       Example:

           step = 8

       calculates one coordinate and paints an 8x8 square.

       The later 4x4, 2x2 and 1x1 passes progressively
       replace these approximations.
       ===================================================== */

    fillBlock(
        startX,
        startY,
        size,
        r,
        g,
        b,
        a = 255
    ) {

        const endX =
            Math.min(
                startX + size,
                this.width
            );

        const endY =
            Math.min(
                startY + size,
                this.height
            );


        for (
            let y = startY;
            y < endY;
            y++
        ) {

            let offset =
                this.getByteIndex(
                    startX,
                    y
                );


            for (
                let x = startX;
                x < endX;
                x++
            ) {

                this.pixels[offset] =
                    r;

                this.pixels[offset + 1] =
                    g;

                this.pixels[offset + 2] =
                    b;

                this.pixels[offset + 3] =
                    a;


                offset += 4;
            }
        }
    }


    /* =====================================================
       Progressive gradient block
       ===================================================== */

    fillGradientBlock(
        startX,
        startY,
        size,
        gradientPosition,
        isInside,
        gradient
    ) {

        if (isInside) {

            this.fillBlock(
                startX,
                startY,
                size,
                0,
                0,
                0,
                255
            );

            return;
        }


        const colour =
            gradient.getLookupColour(
                gradientPosition
            );


        this.fillBlock(
            startX,
            startY,
            size,
            colour.r,
            colour.g,
            colour.b,
            colour.a
        );
    }


    /* =====================================================
       Recolour existing image

       No Mandelbrot calculations occur here.

       This lets the user drag gradient controls and see the
       existing completed pixels recoloured immediately.
       ===================================================== */

    recolour(
        gradient,
        valueToGradientPosition
    ) {

        for (
            let y = 0;
            y < this.height;
            y++
        ) {

            for (
                let x = 0;
                x < this.width;
                x++
            ) {

                const index =
                    this.getPixelIndex(
                        x,
                        y
                    );


                /*
                 * Ignore coordinates for which we have no
                 * actual Mandelbrot result.
                 */

                if (
                    this.computed[index] === 0
                ) {

                    continue;
                }


                const offset =
                    index * 4;


                if (
                    this.inside[index] !== 0
                ) {

                    this.pixels[offset] = 0;
                    this.pixels[offset + 1] = 0;
                    this.pixels[offset + 2] = 0;
                    this.pixels[offset + 3] = 255;

                    continue;
                }


                let position =
                    valueToGradientPosition(
                        this.values[index]
                    );


                position =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            position
                        )
                    );


                gradient.writeColour(
                    position,
                    this.pixels,
                    offset
                );
            }
        }


        this.present();
    }


    /* =====================================================
       Present ImageData
       ===================================================== */

    present() {

        this.context.putImageData(
            this.imageData,
            0,
            0
        );


        /*
         * Selection is drawn after the underlying image.
         */

        if (this.selection) {

            this.drawSelectionOverlay();
        }
    }


    /* =====================================================
       Zoom selection

       This does NOT modify ImageData.

       The rectangle is rendered as a compositing overlay,
       so moving the mouse does not damage the Mandelbrot
       image underneath.
       ===================================================== */

    setSelection(
        x,
        y,
        width,
        height
    ) {

        this.selection = {
            x,
            y,
            width,
            height
        };


        this.present();
    }


    clearSelection() {

        if (!this.selection) {
            return;
        }


        this.selection = null;

        this.present();
    }


    getSelection() {

        if (!this.selection) {
            return null;
        }


        return {
            ...this.selection
        };
    }


    /* =====================================================
       Inverted selection rectangle
       ===================================================== */

    drawSelectionOverlay() {

        if (!this.selection) {
            return;
        }


        const selection =
            this.normaliseRectangle(
                this.selection
            );


        this.context.save();


        /*
         * "difference" produces the inverted/negative-style
         * rectangle we wanted for drag-to-zoom.
         */

        this.context.globalCompositeOperation =
            "difference";


        this.context.fillStyle =
            "#FFFFFF";


        this.context.fillRect(
            selection.x,
            selection.y,
            selection.width,
            selection.height
        );


        /*
         * Strong border around the selected region.
         */

        this.context.lineWidth =
            2;


        this.context.strokeStyle =
            "#FFFFFF";


        this.context.strokeRect(
            selection.x + 1,
            selection.y + 1,
            Math.max(
                0,
                selection.width - 2
            ),
            Math.max(
                0,
                selection.height - 2
            )
        );


        this.context.restore();
    }


    /* =====================================================
       Rectangle normalisation

       Allows mouse dragging in any direction.
       ===================================================== */

    normaliseRectangle(rectangle) {

        let x =
            rectangle.x;

        let y =
            rectangle.y;

        let width =
            rectangle.width;

        let height =
            rectangle.height;


        if (width < 0) {

            x += width;
            width = -width;
        }


        if (height < 0) {

            y += height;
            height = -height;
        }


        return {
            x,
            y,
            width,
            height
        };
    }


    /* =====================================================
       Mouse -> canvas coordinates

       Handles cases where CSS display dimensions differ
       from the canvas's internal pixel dimensions.
       ===================================================== */

    eventToCanvasPosition(event) {

        const rect =
            this.canvas.getBoundingClientRect();


        const scaleX =
            this.canvas.width /
            rect.width;

        const scaleY =
            this.canvas.height /
            rect.height;


        let x =
            (
                event.clientX -
                rect.left
            ) * scaleX;


        let y =
            (
                event.clientY -
                rect.top
            ) * scaleY;


        x =
            Math.max(
                0,
                Math.min(
                    this.width - 1,
                    x
                )
            );


        y =
            Math.max(
                0,
                Math.min(
                    this.height - 1,
                    y
                )
            );


        return {
            x,
            y
        };
    }


    /* =====================================================
       Download PNG
       ===================================================== */

    download(
        filename = "mandelbrot.png"
    ) {

        /*
         * Ensure the temporary zoom rectangle isn't included
         * in the downloaded image.
         */

        this.context.putImageData(
            this.imageData,
            0,
            0
        );


        const link =
            document.createElement("a");


        link.download =
            filename;


        link.href =
            this.canvas.toDataURL(
                "image/png"
            );


        link.click();


        /*
         * Restore selection afterwards if the user happened
         * to download while dragging.
         */

        if (this.selection) {

            this.drawSelectionOverlay();
        }
    }
}
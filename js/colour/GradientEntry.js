class GradientEntry {

    /**
     * Represents one colour stop in a gradient.
     *
     * @param {number} position
     *        Position from 0.0 to 1.0.
     *
     * @param {string} colour
     *        Colour in hexadecimal format, e.g. "#378BDA".
     */
    constructor(position, colour) {

        this.setPosition(position);
        this.setColour(colour);
    }


    /* =====================================================
       Position
       ===================================================== */

    getPosition() {

        return this.position;
    }


    setPosition(position) {

        if (
            typeof position !== "number" ||
            !Number.isFinite(position)
        ) {

            throw new TypeError(
                "Gradient position must be a finite number."
            );
        }


        /*
         * Gradient positions are always normalised.
         */

        this.position = Math.max(
            0.0,
            Math.min(1.0, position)
        );
    }


    /* =====================================================
       Colour
       ===================================================== */

    getColour() {

        return this.colour;
    }


    setColour(colour) {

        if (typeof colour !== "string") {

            throw new TypeError(
                "Gradient colour must be a string."
            );
        }


        let normalised =
            colour.trim().toUpperCase();


        /*
         * Permit both:
         *
         * #378BDA
         * 378BDA
         */

        if (!normalised.startsWith("#")) {

            normalised =
                "#" + normalised;
        }


        if (
            !/^#[0-9A-F]{6}$/.test(normalised)
        ) {

            throw new Error(
                "Gradient colour must use #RRGGBB format."
            );
        }


        this.colour = normalised;
    }


    /* =====================================================
       RGB components
       ===================================================== */

    getRed() {

        return parseInt(
            this.colour.substring(1, 3),
            16
        );
    }


    getGreen() {

        return parseInt(
            this.colour.substring(3, 5),
            16
        );
    }


    getBlue() {

        return parseInt(
            this.colour.substring(5, 7),
            16
        );
    }


    /* =====================================================
       RGB object
       ===================================================== */

    getRGB() {

        return {
            r: this.getRed(),
            g: this.getGreen(),
            b: this.getBlue()
        };
    }


    /* =====================================================
       Copy
       ===================================================== */

    clone() {

        return new GradientEntry(
            this.position,
            this.colour
        );
    }


    /* =====================================================
       Utility
       ===================================================== */

    equals(other) {

        return (
            other instanceof GradientEntry &&
            this.position === other.position &&
            this.colour === other.colour
        );
    }


    toString() {

        return (
            `GradientEntry(` +
            `${this.position}, ` +
            `${this.colour})`
        );
    }
}
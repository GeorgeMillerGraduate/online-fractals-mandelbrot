class SmoothGradient {

    /**
     * Smooth colour gradient using Catmull-Rom interpolation.
     *
     * GradientEntry positions are normalised from 0.0 to 1.0.
     *
     * @param {GradientEntry[]} entries
     */
    constructor(entries = []) {

        this.entries = [];

        this.lookupTable = null;
        this.lookupTableSize = 0;

        if (entries.length > 0) {

            this.setEntries(entries);
        }
    }


    /* =====================================================
       Entries
       ===================================================== */

    setEntries(entries) {

        if (!Array.isArray(entries)) {

            throw new TypeError(
                "Gradient entries must be an array."
            );
        }


        if (entries.length < 2) {

            throw new Error(
                "A gradient requires at least two entries."
            );
        }


        this.entries = entries.map(entry => {

            if (entry instanceof GradientEntry) {

                return entry.clone();
            }


            return new GradientEntry(
                entry.position,
                entry.colour
            );
        });


        this.sortEntries();

        this.invalidateLookupTable();
    }


    getEntries() {

        return this.entries.map(
            entry => entry.clone()
        );
    }


    addEntry(entry) {

        if (!(entry instanceof GradientEntry)) {

            entry = new GradientEntry(
                entry.position,
                entry.colour
            );
        }


        this.entries.push(
            entry.clone()
        );


        this.sortEntries();

        this.invalidateLookupTable();
    }


    removeEntry(index) {

        if (
            index < 0 ||
            index >= this.entries.length
        ) {

            return false;
        }


        if (this.entries.length <= 2) {

            return false;
        }


        this.entries.splice(index, 1);

        this.invalidateLookupTable();

        return true;
    }


    sortEntries() {

        this.entries.sort(
            (a, b) =>
                a.getPosition() -
                b.getPosition()
        );
    }


    /* =====================================================
       Main colour calculation
       ===================================================== */

    getColour(position) {

        if (this.entries.length === 0) {

            return {
                r: 0,
                g: 0,
                b: 0,
                a: 255
            };
        }


        if (this.entries.length === 1) {

            const rgb =
                this.entries[0].getRGB();

            return {
                r: rgb.r,
                g: rgb.g,
                b: rgb.b,
                a: 255
            };
        }


        position = Math.max(
            0.0,
            Math.min(1.0, position)
        );


        /*
         * Outside the gradient range, use the nearest
         * endpoint colour.
         */

        if (
            position <=
            this.entries[0].getPosition()
        ) {

            return this.entryToColour(
                this.entries[0]
            );
        }


        const last =
            this.entries.length - 1;


        if (
            position >=
            this.entries[last].getPosition()
        ) {

            return this.entryToColour(
                this.entries[last]
            );
        }


        /*
         * Find the two entries surrounding this position.
         */

        let i1 = 0;


        for (
            let i = 0;
            i < this.entries.length - 1;
            i++
        ) {

            const left =
                this.entries[i];

            const right =
                this.entries[i + 1];


            if (
                position >= left.getPosition() &&
                position <= right.getPosition()
            ) {

                i1 = i;

                break;
            }
        }


        /*
         * Catmull-Rom needs four points:
         *
         * p0 ---- p1 ---- p2 ---- p3
         *
         * We are interpolating between p1 and p2.
         *
         * At the ends of the gradient the nearest entry
         * is repeated.
         */

        const i0 =
            Math.max(0, i1 - 1);

        const i2 =
            Math.min(
                this.entries.length - 1,
                i1 + 1
            );

        const i3 =
            Math.min(
                this.entries.length - 1,
                i1 + 2
            );


        const p0 =
            this.entries[i0];

        const p1 =
            this.entries[i1];

        const p2 =
            this.entries[i2];

        const p3 =
            this.entries[i3];


        /*
         * Convert the absolute gradient position into the
         * local interpolation position between p1 and p2.
         */

        const range =
            p2.getPosition() -
            p1.getPosition();


        const t =
            range === 0
                ? 0
                : (
                    position -
                    p1.getPosition()
                ) / range;


        return {

            r: this.clampByte(
                this.catmullRom(
                    p0.getRed(),
                    p1.getRed(),
                    p2.getRed(),
                    p3.getRed(),
                    t
                )
            ),

            g: this.clampByte(
                this.catmullRom(
                    p0.getGreen(),
                    p1.getGreen(),
                    p2.getGreen(),
                    p3.getGreen(),
                    t
                )
            ),

            b: this.clampByte(
                this.catmullRom(
                    p0.getBlue(),
                    p1.getBlue(),
                    p2.getBlue(),
                    p3.getBlue(),
                    t
                )
            ),

            a: 255
        };
    }


    /* =====================================================
       Catmull-Rom interpolation
       ===================================================== */

    catmullRom(p0, p1, p2, p3, t) {

        const t2 =
            t * t;

        const t3 =
            t2 * t;


        /*
         * Same Catmull-Rom equation used by the Java
         * SmoothGradient implementation.
         */

        return 0.5 * (

            (2 * p1)

            +

            (-p0 + p2) * t

            +

            (
                2 * p0
                - 5 * p1
                + 4 * p2
                - p3
            ) * t2

            +

            (
                -p0
                + 3 * p1
                - 3 * p2
                + p3
            ) * t3
        );
    }


    /* =====================================================
       Lookup table
       ===================================================== */

    buildLookupTable(size = 4096) {

        size = Math.max(
            2,
            Math.floor(size)
        );


        /*
         * Four bytes per colour:
         *
         * R G B A
         *
         * This can later be copied directly into Canvas
         * ImageData without relying on machine endianness.
         */

        this.lookupTable =
            new Uint8ClampedArray(
                size * 4
            );


        this.lookupTableSize =
            size;


        for (
            let i = 0;
            i < size;
            i++
        ) {

            const position =
                i / (size - 1);


            const colour =
                this.getColour(position);


            const offset =
                i * 4;


            this.lookupTable[offset] =
                colour.r;

            this.lookupTable[offset + 1] =
                colour.g;

            this.lookupTable[offset + 2] =
                colour.b;

            this.lookupTable[offset + 3] =
                colour.a;
        }


        return this.lookupTable;
    }


    /* =====================================================
       Fast lookup
       ===================================================== */

    getLookupColour(position) {

        if (
            !this.lookupTable ||
            this.lookupTableSize < 2
        ) {

            this.buildLookupTable();
        }


        position = Math.max(
            0,
            Math.min(1, position)
        );


        const index =
            Math.round(
                position *
                (this.lookupTableSize - 1)
            );


        const offset =
            index * 4;


        return {

            r: this.lookupTable[offset],

            g: this.lookupTable[
                offset + 1
            ],

            b: this.lookupTable[
                offset + 2
            ],

            a: this.lookupTable[
                offset + 3
            ]
        };
    }


    /* =====================================================
       Write directly into ImageData
       ===================================================== */

    writeColour(
        position,
        target,
        offset
    ) {

        if (
            !this.lookupTable ||
            this.lookupTableSize < 2
        ) {

            this.buildLookupTable();
        }


        position = Math.max(
            0,
            Math.min(1, position)
        );


        const index =
            Math.round(
                position *
                (this.lookupTableSize - 1)
            );


        const sourceOffset =
            index * 4;


        target[offset] =
            this.lookupTable[sourceOffset];

        target[offset + 1] =
            this.lookupTable[
                sourceOffset + 1
            ];

        target[offset + 2] =
            this.lookupTable[
                sourceOffset + 2
            ];

        target[offset + 3] =
            255;
    }


    /* =====================================================
       Invalidate cache
       ===================================================== */

    invalidateLookupTable() {

        this.lookupTable = null;

        this.lookupTableSize = 0;
    }


    /* =====================================================
       Utilities
       ===================================================== */

    entryToColour(entry) {

        return {

            r: entry.getRed(),

            g: entry.getGreen(),

            b: entry.getBlue(),

            a: 255
        };
    }


    clampByte(value) {

        return Math.max(
            0,
            Math.min(
                255,
                Math.round(value)
            )
        );
    }


    /* =====================================================
       Default Mandelbrot gradient
       ===================================================== */

    static createDefault() {

        return new SmoothGradient([

            new GradientEntry(
                0.00,
                "#00086A"
            ),

            new GradientEntry(
                0.25,
                "#378BDA"
            ),

            new GradientEntry(
                0.50,
                "#F6FBE1"
            ),

            new GradientEntry(
                0.75,
                "#FDA000"
            ),

            new GradientEntry(
                1.00,
                "#00086A"
            )
        ]);
    }
}
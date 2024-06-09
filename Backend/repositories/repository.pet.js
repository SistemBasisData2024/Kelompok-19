const { pool } = require("../config/db.config.js");
const { v4: uuidv4 } = require('uuid');

//Get user's owned pets
exports.getOwnedPets = async function (req, res){
    const { username } = req.body;

    try {
        const result = await pool.query(
            `SELECT po.username, p.name, p.pet_avatar
            FROM pet_owner po
            JOIN pet p ON po.pet_id = p.id
            WHERE po.username = $1;`,
            [username]
        );

        if (result.rows.length === 0) {
            res.status(404).send("You don't have any pet yet");
        } else {
            res.send(result.rows);
        }
    } catch (error) {
        res.status(500).send({
            err: error.message,
        });
    }
};

//Updating user's owned pet
exports.UpdateOwnedPet = async function (req, res){
    // Extract username from request body
    const { username } = req.body;

    // Log the request body for debugging
    console.log('Request body:', req.body);

    // Check if username is provided
    if (!username) {
        return res.status(400).send({ err: "Username is required" });
    }

    try {
        // Fetch the user's level
        const getLevResult = await pool.query('SELECT level FROM user_database WHERE username = $1', [username]);

        // Check if the user exists and log the result
        if (getLevResult.rows.length === 0) {
            return res.status(404).send({ err: "User not found" });
        }

        const getLev = getLevResult.rows[0].level;
        console.log('User level:', getLev);

        // Fetch the pets and their minimum levels
        const petLevelResult = await pool.query('SELECT id, minimum_level FROM pet');
        const petRows = petLevelResult.rows;

        // Delete all entries for the given username from the pet_owner table
        await pool.query('DELETE FROM pet_owner WHERE username = $1', [username]);

        // Insert new entries based on user's level
        const insertedPets = [];

        for (const pet of petRows) {
            if (getLev >= pet.minimum_level) {
                const result = await pool.query(
                    'INSERT INTO pet_owner (username, pet_id) VALUES ($1, $2) RETURNING username, pet_id',
                    [username, pet.id]
                );

                if (result.rows.length > 0) {
                    insertedPets.push(result.rows[0]);
                    console.log(`Pet ownership updated for pet ID ${pet.id}`);
                }
            }
        }

        // Send success response with inserted records
        res.status(200).json({
            message: 'Pets updated successfully',
            insertedPets: insertedPets
        });
    } catch (error) {
        // Log the error and send error response
        console.error('Error updating pets:', error.message);
        res.status(500).send({ err: error.message });
    }
};

//Get user's not owned pet
exports.getAllPets = async function (req, res) { 
    const { username } = req.body;

    try { 
        const result = await pool.query( 
            `SELECT p.id, p.name, p.pet_avatar
            FROM pet p
            LEFT JOIN pet_owner po ON p.id = po.pet_id AND po.username = $1
            WHERE po.username IS NULL
            ORDER BY p.name ASC;`,
            [username]
        ); 

        if (result.rows.length === 0) { 
            res.status(404).send("No pets found"); 
        } else { 
            res.send(result.rows); 
        } 
    } catch (error) { 
        res.status(500).send({ 
            err: error.message, 
        }); 
    } 
};

//Get user's newest pet
exports.getMyNewestPet = async function (req, res) { 
    const { username } = req.body;

    try { 
        const result = await pool.query( 
            `SELECT po.username, p.name, p.pet_avatar, p.minimum_level
            FROM pet_owner po
            JOIN pet p ON po.pet_id = p.id
            WHERE username = $1
            ORDER BY po.ctid DESC
            LIMIT 1;`,
            [username]
        ); 

        if (result.rows.length === 0) { 
            res.status(404).send("No pets found"); 
        } else { 
            res.send(result.rows); 
        } 
    } catch (error) { 
        res.status(500).send({ 
            err: error.message, 
        }); 
    } 
    
};
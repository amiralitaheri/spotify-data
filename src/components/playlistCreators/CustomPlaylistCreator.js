import React, {useCallback, useReducer, useState} from "react";
import Card from "../Card";
import styles from './CustomPlaylistCreator.module.scss'
import Slider from "../Slider";
import {useSelector} from "react-redux";
import Button from "../Button";
import GenreSelection from "../GenreSelection";
import * as Spotify from "../../utils/spotify";
import PlaylistResult from "../PlaylistResult";

const reducer = (state, action) => {
    switch (action.name) {
        case 'danceability':
            return {...state, danceability: action.value}
        case 'energy':
            return {...state, energy: action.value}
        case 'acousticness':
            return {...state, acousticness: action.value}
        case 'speechiness':
            return {...state, speechiness: action.value}
        case 'instrumentalness':
            return {...state, instrumentalness: action.value}
        case 'valence':
            return {...state, valence: action.value}
        case 'liveness':
            return {...state, liveness: action.value}
        case 'tempo':
            return {...state, tempo: action.value}
        case 'name':
            return {...state, name: action.value}
        case 'genres':
            return {...state, genres: action.value}
        case 'popularity':
            return {...state, popularity: action.value}
        default:
            throw new Error();
    }
}
const sliderSetting = {
    danceability: {
        min: 0,
        max: 100,
        step: 1,
        description: 'Danceability describes how suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity. A value of 0 is least danceable and 100 is most danceable.'
    },
    energy: {
        min: 0,
        max: 100,
        step: 1,
        description: 'Energy is a measure from 0 to 100 and represents a perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy. For example, death metal has high energy, while a Bach prelude scores low on the scale. Perceptual features contributing to this attribute include dynamic range, perceived loudness, timbre, onset rate, and general entropy.'
    },
    acousticness: {
        min: 0,
        max: 100,
        step: 1,
        description: 'A confidence measure from 0 to 100 of whether the track is acoustic. 100 represents high confidence the track is acoustic.'
    },
    speechiness: {
        min: 0,
        max: 100,
        step: 1,
        description: 'Speechiness detects the presence of spoken words in a track. The more exclusively speech-like the recording (e.g. talk show, audio book, poetry), the closer to 100 the attribute value. Values above 66 describe tracks that are probably made entirely of spoken words. Values between 0.33 and 0.66 describe tracks that may contain both music and speech, either in sections or layered, including such cases as rap music. Values below 0.33 most likely represent music and other non-speech-like tracks.'
    },
    instrumentalness: {
        min: 0,
        max: 100,
        step: 1,
        description: 'Predicts whether a track contains no vocals. “Ooh” and “aah” sounds are treated as instrumental in this context. Rap or spoken word tracks are clearly “vocal”. The closer the instrumentalness value is to 100, the greater likelihood the track contains no vocal content. Values above 50 are intended to represent instrumental tracks, but confidence is higher as the value approaches 100.'
    },
    valence: {
        min: 0,
        max: 100,
        step: 1,
        description: 'A measure from 0 to 100 describing the musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry).'
    },
    liveness: {
        min: 0,
        max: 100,
        step: 1,
        description: 'Detects the presence of an audience in the recording. Higher liveness values represent an increased probability that the track was performed live. A value above 80 provides strong likelihood that the track is live.'
    },
    tempo: {
        min: 20,
        max: 500,
        step: 5,
        description: 'The overall estimated tempo of a track in beats per minute (BPM). In musical terminology, tempo is the speed or pace of a given piece and derives directly from the average beat duration.'
    },
    popularity: {
        min: 0,
        max: 100,
        step: 1,
        description: 'The popularity of the track. The value will be between 0 and 100, with 100 being the most popular. The popularity is calculated by algorithm and is based, in the most part, on the total number of plays the track has had and how recent those plays are.'
    }

}
const date = (new Date()).toISOString().split('T')[0];

//todo: find out why component renders twice!
export default (props) => {
    const data = useSelector(state => state.data);
    const initialState = useCallback({
        danceability: Math.round(data.audioFeaturesAverage.danceability * 100),
        energy: Math.round(data.audioFeaturesAverage.energy * 100),
        acousticness: Math.round(data.audioFeaturesAverage.acousticness * 100),
        speechiness: Math.round(data.audioFeaturesAverage.speechiness * 100),
        instrumentalness: Math.round(data.audioFeaturesAverage.instrumentalness * 100),
        valence: Math.round(data.audioFeaturesAverage.valence * 100),
        liveness: Math.round(data.audioFeaturesAverage.liveness * 100),
        tempo: Math.round(data.audioFeaturesAverage.tempo),
        popularity: 80,
        name: `Spotida custom playlist ${date}`,
        genres: [
            "alt-rock",
            "alternative",
        ]
    }, [data])
    const [state, dispatch] = useReducer(reducer, initialState);
    const [playlistState, setPlaylistState] = useState({state: 'NORMAL'});
    const handleChange = useCallback((name, event, newValue) => {
        dispatch({
            name: name,
            value: newValue
        });
    }, []);

    const createPlaylist = useCallback(async event => {
        event.preventDefault();
        setPlaylistState({state: 'PENDING'});
        const options = {
            headers: {
                'Authorization': `Bearer ${data.token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        };
        const {genres, name, tempo, popularity, ...filters} = state;
        const filtersString = Object.keys(filters).map(key => `target_${key}=${filters[key] / 100}`).join('&')
        const url = `https://api.spotify.com/v1/recommendations?limit=100&seed_genres=${genres.join(',')}&target_tempo=${tempo}&target_popularity=${popularity}&${filtersString}`
        try {
            const response = await fetch(url, options);
            if (response.status !== 200 && response.status !== 201) {
                throw new Error(`Received a ${response.status} from Spotify`);
            }
            const browse = await response.json();
            let playlist = await Spotify.createPlaylist(data.token, data.me.id, JSON.stringify({
                name,
                description: JSON.stringify(state)
            }));
            await Spotify.addTracksToPlaylist(data.token, browse.tracks.map(track => track.uri), playlist.id);
            setPlaylistState({
                state: 'SUCCESS',
                message: playlist.external_urls.spotify
            });
        } catch (e) {
            setPlaylistState({
                state: 'ERROR',
                message: e.message
            })
        }
    }, [state, data]);


    return <Card className={props.className}>
        <h2>Custom Playlist</h2>
        <p>Create a custom playlist with Spotify recommendation API. Feel free to play around with parameters and share
            your playlist with others.</p>
        <form className={styles.form}>
            <label htmlFor='name'>Name</label>
            <input id='name' type="text" value={state.name}
                   onChange={useCallback(event => handleChange('name', event, event.target.value), [handleChange])}
                   className={styles.input}/>
            <label>Genres (maximum: 5)</label>
            <GenreSelection value={state.genres}
                            onChange={useCallback((newValue) => handleChange('genres', null, newValue), [handleChange])}/>
            {Object.keys(sliderSetting).map(key => {
                return <Slider
                    key={key}
                    name={key}
                    value={state[key]}
                    onChange={useCallback((event, newValue) => handleChange(key, event, newValue), [key])}
                    aria-labelledby={key}
                    valueLabelDisplay="auto"
                    min={sliderSetting[key].min}
                    max={sliderSetting[key].max}
                    step={sliderSetting[key].step}
                    description={sliderSetting[key].description}
                />
            })}
            <Button
                onClick={createPlaylist}
                disabled={playlistState.state === 'PENDING'}
            >Create</Button>
        </form>
        <PlaylistResult status={playlistState.state} message={playlistState.message}/>
    </Card>
}